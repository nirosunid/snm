import { tool } from "ai";
import { z } from "zod";

import { getBrandVoice } from "@/lib/voice/retrieval";

/**
 * Tool: pull top-K stylistically similar voice samples for a brand.
 *
 * The LLM gets to choose the query string — typically the carousel topic
 * or the slide-specific concept it's about to write. Returns a small JSON
 * payload the model can incorporate inline.
 */
export function getBrandVoiceTool({
  brandId,
  k = 5,
}: {
  brandId: number | undefined;
  k?: number;
}) {
  return tool({
    description:
      "Retrieve up to K of the brand's past posts that are stylistically similar to a query. Use this when you need to mimic the brand's actual writing voice.",
    parameters: z.object({
      query: z
        .string()
        .min(1)
        .describe("Topic or concept to match against the brand's prior posts."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe(`Max samples to return (default ${k}).`),
    }),
    execute: async ({ query, limit }) => {
      const samples = await getBrandVoice(brandId, query, limit ?? k);
      return { count: samples.length, samples };
    },
  });
}
