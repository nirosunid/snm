/**
 * Writer stage — expands a Plan into a final DraftPayload.
 *
 * For each slide:
 *   - copy is generated from the planner's copyOutline using the brand brief.
 *   - if image_source: 'asset', pick an asset URL via searchAssets.
 *
 * One LLM call (structured-output) over the whole plan keeps round-trips low
 * for MVP-1; per-slide calls land if/when we need finer control.
 */

import { z } from "zod";

import { searchAssets } from "@/lib/assets/search";
import type { User } from "@/payload-types";

import { brandBriefText, type BrandLike } from "./brand";
import { llm } from "./client";
import {
  DraftPayloadSchema,
  type DraftPayload,
  type Plan,
  type Slide,
} from "./schemas";

const SYSTEM_TEMPLATE = `\
You are a brand-voice copywriter. Read the brand brief and the plan, then
write the final carousel as JSON.

{brief}

You will receive an array of slide outlines plus a captionOutline. For each
outline, produce final copy that matches the brand voice. Keep the slide
\`type\` and array order EXACTLY as supplied. Don't include URLs in slide
text — Instagram blocks them.

Length guidelines:
  - hook: 8-14 words
  - listicle_item: 12-25 words
  - cta: 5-12 words
  - quote: 8-20 words plus optional attribution
  - image_caption: 6-14 words (will overlay a photo)

Respond with JSON exactly in this shape (the imageUrl field is filled in
later — you don't need to populate it):

{
  "slides": [
    { "type": "<type>", "copy": "..." },
    ...
  ],
  "caption": "...",
  "hashtags": ["one", "two", "three"]
}
`;

// We let the writer write the bare slide shape (type + copy). The
// orchestrator then merges in imageUrl/caption/attribution from the plan
// and asset lookup before returning the final DraftPayload.
const WriterOutputSlide = z.object({
  type: z.enum(["hook", "listicle_item", "cta", "quote", "image_caption"]),
  copy: z.string(),
});
const WriterOutputSchema = z.object({
  slides: z.array(WriterOutputSlide).min(1).max(10),
  caption: z.string(),
  hashtags: z.array(z.string()).default([]),
});

export type WriteStageResult = {
  draft: DraftPayload;
  provider: string;
  model: string;
  assetsResolved: number;
  usage: { promptTokens?: number; completionTokens?: number } | undefined;
};

export async function writeCarousel({
  brand,
  brandId,
  plan,
  user,
  feedback,
}: {
  brand: BrandLike;
  brandId: number | undefined;
  plan: Plan;
  user: User;
  /** Optional reviewer feedback appended to the writer prompt. */
  feedback?: string;
}): Promise<WriteStageResult> {
  const planForLLM = {
    slides: plan.slides.map((s) => ({
      type: s.type,
      copyOutline: s.copyOutline,
    })),
    captionOutline: plan.captionOutline,
    hashtagsHint: plan.hashtags,
  };

  const promptParts = [
    `Plan:\n${JSON.stringify(planForLLM, null, 2)}`,
    feedback ?? "",
  ].filter(Boolean);

  const result = await llm.object({
    stage: "writer",
    schema: WriterOutputSchema,
    system: SYSTEM_TEMPLATE.replace("{brief}", brandBriefText(brand)),
    prompt: promptParts.join("\n\n"),
    cacheSystem: true,
  });

  // Resolve asset URLs for slides the planner marked as image_source: 'asset'.
  // We do one searchAssets call per asset slide (small N — ≤10 slides per
  // carousel) keyed by the planner's asset_query.
  let assetsResolved = 0;
  const slides: Slide[] = [];
  for (let i = 0; i < plan.slides.length; i++) {
    const planSlide = plan.slides[i];
    const writerSlide = result.object.slides[i] ?? {
      type: planSlide.type,
      copy: planSlide.copyOutline,
    };
    let imageUrl: string | null | undefined = undefined;
    if (planSlide.type === "image_caption" && brandId) {
      // Use the planner's asset_query when present; fall back to the
      // copyOutline so we still have something to search on if the planner
      // forgot to fill it in.
      const query = planSlide.asset_query?.trim() || planSlide.copyOutline;
      try {
        const matches = await searchAssets({
          brandId,
          query,
          user,
          limit: 5,
        });
        const url = matches.find((m) => Boolean(m.url))?.url ?? null;
        imageUrl = url;
        if (url) assetsResolved++;
      } catch {
        // Fall through with imageUrl undefined; orchestrator can decide.
      }
    }
    slides.push({
      type: writerSlide.type,
      copy: writerSlide.copy,
      ...(imageUrl !== undefined ? { imageUrl } : {}),
    });
  }

  const draft: DraftPayload = DraftPayloadSchema.parse({
    slides,
    caption: result.object.caption,
    hashtags: result.object.hashtags,
  });

  return {
    draft,
    provider: result.provider,
    model: result.model,
    assetsResolved,
    usage: (result.raw as { usage?: WriteStageResult["usage"] }).usage,
  };
}
