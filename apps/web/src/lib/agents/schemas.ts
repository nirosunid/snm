/**
 * Zod schemas shared across the agent surface.
 *
 * Issue #2 (tracer bullet) needs only a minimal request/response shape and a
 * draft payload structure. Real schemas (Plan / WriteResult / Review with
 * slide types, image sources, brand profile, etc.) land in Issue #8/#9 when
 * the agent pipeline ships.
 */

import { z } from "zod";

/** Slide types the renderer + planner know about. */
export const SLIDE_TYPES = [
  "hook",
  "listicle_item",
  "cta",
  "quote",
  "image_caption",
] as const;
export const SlideTypeSchema = z.enum(SLIDE_TYPES);
export type SlideType = z.infer<typeof SlideTypeSchema>;

/** A finished slide ready for the renderer. */
export const SlideSchema = z.object({
  type: SlideTypeSchema.describe("Slide role in the carousel."),
  copy: z.string().describe("The text shown on the slide."),
  imageUrl: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe(
      "Asset URL when this slide is rendered with the image_caption template; null/omitted otherwise. Accepts relative paths (Payload media URLs are typically /api/media/file/...).",
    ),
  caption: z.string().nullable().optional(),
  attribution: z.string().nullable().optional(),
});
export type Slide = z.infer<typeof SlideSchema>;

export const DraftPayloadSchema = z.object({
  slides: z.array(SlideSchema).min(1).max(10),
  caption: z.string().describe("Caption posted with the carousel."),
  hashtags: z.array(z.string()).default([]),
});
export type DraftPayload = z.infer<typeof DraftPayloadSchema>;

/**
 * A Plan is what the planner stage emits. The writer turns it into a
 * DraftPayload by expanding `copyOutline` into final slide copy and
 * (when `image_source: 'asset'`) resolving an asset URL from the brand's
 * library via `getAssetLibraryTool`.
 */
// type implies image source: `image_caption` always renders a real photo
// from the brand's asset library; every other type uses a Satori template.
// We dropped a separate `image_source` field because providers were
// frequently defaulting it to "template" even when type was image_caption,
// leaving us with broken asset-source intentions.
export const PlanSlideSchema = z.object({
  type: SlideTypeSchema,
  copyOutline: z
    .string()
    .describe(
      "1-2 sentence outline of what this slide should say. The writer expands it into final on-brand copy.",
    ),
  asset_query: z
    .string()
    .describe(
      "Required when type = image_caption: search query (tag/name/description) for the asset library. Empty string for all other types.",
    ),
});
export type PlanSlide = z.infer<typeof PlanSlideSchema>;

export const PlanSchema = z.object({
  slides: z.array(PlanSlideSchema).min(1).max(10),
  captionOutline: z.string(),
  hashtags: z.array(z.string()),
});
export type Plan = z.infer<typeof PlanSchema>;

export const REVIEW_ISSUE_KINDS = [
  "brand_voice",
  "factual_claim",
  "cta_missing",
  "url_in_copy",
  "length",
  "other",
] as const;
export const ReviewIssueKindSchema = z.enum(REVIEW_ISSUE_KINDS);
export type ReviewIssueKind = z.infer<typeof ReviewIssueKindSchema>;

export const ReviewIssueSchema = z.object({
  kind: ReviewIssueKindSchema,
  slideIndex: z
    .number()
    .int()
    .min(-1)
    .describe(
      "Zero-based slide index this issue refers to. Use -1 for issues that apply to the caption/hashtags or the carousel as a whole.",
    ),
  message: z.string().min(1),
});
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;

export const ReviewSchema = z.object({
  verdict: z.enum(["ship", "revise"]),
  issues: z.array(ReviewIssueSchema),
  cta_present: z.boolean(),
});
export type Review = z.infer<typeof ReviewSchema>;

/** Persisted on content-jobs.review when the pipeline finalizes. */
export const ReviewRecordSchema = ReviewSchema.extend({
  revisionsRun: z.number().int().nonnegative(),
});
export type ReviewRecord = z.infer<typeof ReviewRecordSchema>;

/** Promo intent: signals to the planner / writer that this carousel is
 *  selling something, and steers the CTA away from raw URLs (which IG
 *  blocks in slide overlays and de-prioritizes in captions). */
export const PROMO_KINDS = ["affiliate", "own_product"] as const;
export const PromoKindSchema = z.enum(PROMO_KINDS);
export type PromoKind = z.infer<typeof PromoKindSchema>;

export const PromoSchema = z.object({
  kind: PromoKindSchema,
  productInfo: z
    .string()
    .max(2000)
    .optional()
    .describe(
      "Free-form notes the customer pasted: product name, key features, audience fit, affiliate disclosure language, etc. No URL scraper in MVP-1.",
    ),
});
export type Promo = z.infer<typeof PromoSchema>;

export const GenerateRequestSchema = z.object({
  topic: z.string().min(3).max(300),
  brandId: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  promo: PromoSchema.optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const GenerateResponseSchema = z.object({
  jobId: z.number().int().positive(),
  status: z.enum(["queued", "generating", "ready", "approved", "published", "failed"]),
  brand: z.string(),
  topic: z.string(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  draft: DraftPayloadSchema.nullable(),
  voiceSamplesUsed: z.number().int().nonnegative().default(0),
  review: z
    .object({
      verdict: z.enum(["ship", "revise"]),
      issues: z.array(ReviewIssueSchema),
      cta_present: z.boolean(),
      revisionsRun: z.number().int().nonnegative(),
    })
    .nullable(),
  costCents: z.number().nonnegative().nullable(),
  error: z.string().nullable(),
});
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
