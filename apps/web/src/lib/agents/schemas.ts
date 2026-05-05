/**
 * Zod schemas shared across the agent surface.
 *
 * Issue #2 (tracer bullet) needs only a minimal request/response shape and a
 * draft payload structure. Real schemas (Plan / WriteResult / Review with
 * slide types, image sources, brand profile, etc.) land in Issue #8/#9 when
 * the agent pipeline ships.
 */

import { z } from "zod";

export const SlideSchema = z.object({
  type: z.enum(["hook", "listicle_item", "cta"]).describe("Slide role in the carousel."),
  copy: z.string().describe("The text shown on the slide."),
});
export type Slide = z.infer<typeof SlideSchema>;

export const DraftPayloadSchema = z.object({
  slides: z.array(SlideSchema).min(1).max(10),
  caption: z.string().describe("Caption posted with the carousel."),
  hashtags: z.array(z.string()).default([]),
});
export type DraftPayload = z.infer<typeof DraftPayloadSchema>;

export const GenerateRequestSchema = z.object({
  topic: z.string().min(3).max(300),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const GenerateResponseSchema = z.object({
  brand: z.string(),
  topic: z.string(),
  provider: z.string(),
  model: z.string(),
  draft: DraftPayloadSchema,
});
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;
