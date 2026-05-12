/**
 * Reviewer stage — critiques the writer's draft against the brand brief.
 *
 * Emits a verdict ("ship" or "revise") plus structured issues that the
 * pipeline either feeds back into the writer for one revision pass, or
 * persists on the content-jobs row so the customer sees them in the
 * approval queue UI (#11).
 */

import { brandBriefText, type BrandLike } from "./brand";
import { llm } from "./client";
import {
  ReviewSchema,
  type DraftPayload,
  type Review,
} from "./schemas";

const SYSTEM_TEMPLATE = `\
You are the brand's editor. You critique a finished carousel draft against
the brand brief and the voice samples. Be tough but specific.

{brief}{voiceHint}

Check for:
  - brand_voice  — does each slide sound like the brand? Tone, vocabulary, rhythm.
  - factual_claim — any claim a casual fact-check would dispute? Flag specific spans.
  - cta_missing  — is there a clear call-to-action (closing line) in one slide?
  - url_in_copy  — Instagram blocks URLs in slides; flag any.
  - length       — slides too long or too short for their type?
  - other        — anything else that would embarrass the brand.

Return JSON with:
  - verdict: "ship" if the draft is publishable as-is; "revise" otherwise.
  - issues: an array. Empty when verdict is "ship". When "revise", each
    issue MUST have a kind, a slideIndex (zero-based; use -1 for caption
    or carousel-level issues), and a concrete message the writer can act on.
  - cta_present: true if the carousel has a recognizable CTA, false otherwise.

Be decisive. If the draft is fine, ship it.
`;

export type ReviewStageResult = {
  review: Review;
  provider: string;
  model: string;
  usage: { promptTokens?: number; completionTokens?: number } | undefined;
};

export async function reviewDraft({
  brand,
  draft,
  voiceSamples,
}: {
  brand: BrandLike;
  draft: DraftPayload;
  voiceSamples: string[];
}): Promise<ReviewStageResult> {
  const voiceHint =
    voiceSamples.length > 0
      ? `\n\nVoice samples for reference:\n\n${voiceSamples.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")}\n`
      : "";

  const system = SYSTEM_TEMPLATE.replace("{brief}", brandBriefText(brand)).replace(
    "{voiceHint}",
    voiceHint,
  );

  const result = await llm.object({
    stage: "reviewer",
    schema: ReviewSchema,
    system,
    prompt: `Review this draft:\n${JSON.stringify(draft, null, 2)}`,
    cacheSystem: true,
  });

  // Defensive: if the model said "ship" but populated issues anyway, drop
  // them (we trust the verdict). If "revise" but emitted no issues, demote
  // to "ship" — there's nothing actionable to send back to the writer.
  let review = result.object;
  if (review.verdict === "ship" && review.issues.length > 0) {
    review = { ...review, issues: [] };
  } else if (review.verdict === "revise" && review.issues.length === 0) {
    review = { ...review, verdict: "ship" };
  }

  return {
    review,
    provider: result.provider,
    model: result.model,
    usage: (result.raw as { usage?: ReviewStageResult["usage"] }).usage,
  };
}

/** Format issues for inclusion in the writer's revision prompt. */
export function formatIssuesForWriter(issues: Review["issues"]): string {
  if (issues.length === 0) return "";
  const lines = issues.map((i) => {
    const where =
      i.slideIndex === -1 ? "[carousel]" : `[slide ${i.slideIndex + 1}]`;
    return `- ${where} (${i.kind}) ${i.message}`;
  });
  return [
    "",
    "The reviewer flagged these issues with your first draft — fix them in this revision:",
    "",
    ...lines,
    "",
  ].join("\n");
}
