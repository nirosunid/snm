import { tool } from "ai";
import { z } from "zod";

import { searchAssets } from "@/lib/assets/search";
import type { User } from "@/payload-types";

/**
 * Tool: search the brand's uploaded assets by tag/name/description.
 *
 * Closes Issue #6's deferred LLM-tool acceptance. The planner (Issue #9)
 * will hand this to the writer when it emits a slide with
 * `image_source: "asset"`.
 */
export function getAssetLibraryTool({
  brandId,
  user,
  limit = 10,
}: {
  brandId: number;
  user: User;
  limit?: number;
}) {
  return tool({
    description:
      "Search the brand's uploaded photo library by tag, name, or description. Returns matching assets with their URLs so a slide can render the actual photo.",
    parameters: z.object({
      query: z
        .string()
        .min(1)
        .describe("Tag, product name, or description fragment."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe(`Max assets to return (default ${limit}).`),
    }),
    execute: async ({ query, limit: callerLimit }) => {
      const results = await searchAssets({
        brandId,
        query,
        user,
        limit: callerLimit ?? limit,
      });
      return {
        count: results.length,
        assets: results.map((a) => ({
          id: a.id,
          name: a.name,
          tags: a.tags,
          description: a.description ?? null,
          url: a.url,
        })),
      };
    },
  });
}
