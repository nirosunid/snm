/**
 * Planner stage — decides slide structure and image source per slide.
 *
 * Reads the brand brief + topic + (optional) voice samples; emits a Plan
 * the writer expands into a DraftPayload.
 */

import { brandBriefText, type BrandLike } from "./brand";
import { llm } from "./client";
import { PlanSchema, type Plan } from "./schemas";

const SYSTEM_TEMPLATE = `\
You are a carousel planner. Read the brand brief, the requested topic, and
(when provided) the brand's voice samples. Emit a 3-slide plan as JSON.

{brief}{voiceHint}

Slide types you may use:
  - hook: a swipe-earning headline (templated)
  - listicle_item: a single concrete tip (templated)
  - cta: a closing line that drives engagement (templated)
  - quote: a short pulled-quote moment (templated)
  - image_caption: a real photo from the brand's uploaded library with a short caption overlay — ONLY pick this if {assetsAvailable}

Default shape for a 3-slide carousel is hook → listicle_item → cta. Substitute one of those for an image_caption when the topic is product- or visual-led AND assets are available.

For each slide write a 1-2 sentence copyOutline describing what the writer should say. Don't write the final copy yet.

When type is image_caption, set asset_query to 1-3 keywords matching the photo you want from the asset library (search across tags, name, description). For all other types, set asset_query to an empty string.

Also produce a captionOutline (1-2 sentences for the post caption) and 3-6 hashtags (no leading #).
`;

export type PlanStageResult = {
  plan: Plan;
  provider: string;
  model: string;
};

export async function planCarousel({
  brand,
  topic,
  voiceSamples,
  assetsAvailable,
}: {
  brand: BrandLike;
  topic: string;
  voiceSamples: string[];
  assetsAvailable: boolean;
}): Promise<PlanStageResult> {
  const voiceHint =
    voiceSamples.length > 0
      ? `\n\nVoice samples — mimic this style:\n\n${voiceSamples.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")}\n`
      : "";

  const system = SYSTEM_TEMPLATE.replace("{brief}", brandBriefText(brand))
    .replace("{voiceHint}", voiceHint)
    .replace(
      "{assetsAvailable}",
      assetsAvailable
        ? "the brand has uploaded assets"
        : "the brand has NO uploaded assets — never pick image_source: asset",
    );

  const result = await llm.object({
    stage: "planner",
    schema: PlanSchema,
    system,
    prompt: `Plan a 3-slide carousel about: ${topic}`,
    cacheSystem: true,
  });

  // Defensive: if planner picked image_caption slides (which require an
  // asset) but the brand has no assets, demote them to a templated hook so
  // the writer doesn't end up with an unresolvable image slot.
  const safePlan: Plan = {
    ...result.object,
    slides: result.object.slides.map((s) =>
      s.type === "image_caption" && !assetsAvailable
        ? { ...s, type: "hook", asset_query: "" }
        : s,
    ),
  };

  return {
    plan: safePlan,
    provider: result.provider,
    model: result.model,
  };
}
