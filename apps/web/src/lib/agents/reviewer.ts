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
import { findCtaIdiom, RECOGNIZED_CTA_IDIOMS } from "./cta";
import {
  ReviewSchema,
  type DraftPayload,
  type Promo,
  type Review,
  type ReviewIssue,
} from "./schemas";

const SYSTEM_TEMPLATE = `\
You are the brand's editor. You critique a finished carousel draft against
the brand brief and the voice samples. Be tough but specific.

{brief}{voiceHint}{promoHint}

Check for:
  - brand_voice  — does each slide sound like the brand? Tone, vocabulary, rhythm.
  - factual_claim — any claim a casual fact-check would dispute? Flag specific spans.
  - cta_missing  — is there a clear call-to-action (closing line)? In a promo, it MUST use one of the recognized Instagram-native idioms (e.g. "link in bio").
  - url_in_copy  — Instagram blocks URLs in slides AND de-prioritizes them in captions. Flag any.
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

function reviewerPromoHint(promo: Promo | undefined): string {
  if (!promo) return "";
  const idioms = RECOGNIZED_CTA_IDIOMS.slice(0, 6).join(", ");
  const disclosure =
    promo.kind === "affiliate"
      ? "\n  - This is an AFFILIATE post — confirm the caption signals a partnership/disclosure (\"partner pick\", \"we earn a small commission\", or similar)."
      : "";
  return `\n\nPROMO REVIEW (extra requirements for promo posts):\n  - The CTA slide must use one of: ${idioms}.${disclosure}\n  - URLs are not allowed; the CTA must rely on these idioms instead.\n`;
}

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
  promo,
}: {
  brand: BrandLike;
  draft: DraftPayload;
  voiceSamples: string[];
  promo?: Promo;
}): Promise<ReviewStageResult> {
  const voiceHint =
    voiceSamples.length > 0
      ? `\n\nVoice samples for reference:\n\n${voiceSamples.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")}\n`
      : "";

  const system = SYSTEM_TEMPLATE.replace("{brief}", brandBriefText(brand))
    .replace("{voiceHint}", voiceHint)
    .replace("{promoHint}", reviewerPromoHint(promo));

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

  // Deterministic CTA-idiom check: scan slide copy + caption against the
  // known idiom list. The model is the primary judge of "is there a real
  // CTA?", but in promo mode we layer a hard, code-driven check so a
  // missing idiom can't slip through with a generous reviewer.
  const ctaIdiom = findCtaIdiom(
    [draft.caption, ...draft.slides.map((s) => s.copy)].join("\n"),
  );
  if (promo && !ctaIdiom) {
    const issue: ReviewIssue = {
      kind: "cta_missing",
      slideIndex: -1,
      message: `Promo posts must close with one of these Instagram CTA idioms: ${RECOGNIZED_CTA_IDIOMS.slice(0, 4).join(", ")}.`,
    };
    review = {
      verdict: "revise",
      cta_present: false,
      issues: [...review.issues, issue],
    };
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
