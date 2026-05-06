import { getPayload } from "payload";

import config from "@payload-config";

import type { Asset, User } from "@/payload-types";

export type AssetSearchResult = {
  id: number;
  name: string;
  description?: string | null;
  tags: string[];
  url: string | null;
  thumbnailURL: string | null;
};

/**
 * Tag- and name-aware search across a brand's assets. Substring match on
 * tags, name, and description; case-insensitive.
 *
 * Used by the library page filter and (in #8) by the LLM-tool wrapper.
 */
export async function searchAssets({
  brandId,
  query,
  user,
  limit = 50,
}: {
  brandId: number;
  query?: string;
  user: User;
  limit?: number;
}): Promise<AssetSearchResult[]> {
  const payload = await getPayload({ config });
  const q = (query ?? "").trim().toLowerCase();

  // We always scope to the brand (and access-scope to the user). The text
  // filter is applied in JS after fetch — Payload's where on array fields
  // is fiddly, and brand-scoped result sets are small (<100 in MVP-1).
  const { docs } = await payload.find({
    collection: "assets",
    where: { brand: { equals: brandId } },
    user,
    overrideAccess: false,
    sort: "-createdAt",
    limit,
    depth: 1,
  });

  // OR semantics: any non-stopword token in the query matching the asset's
  // tags / name / description counts as a hit. AND was too strict for
  // copy-led fallback queries — "Fresh drop alert" failing to match a
  // "drop"-tagged asset because of the noise tokens.
  const STOPWORDS = new Set([
    "a", "an", "the", "and", "or", "of", "to", "for", "in", "on", "with",
    "is", "are", "this", "that", "these", "those", "you", "your",
  ]);
  const tokens = q
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  const scored = docs
    .map((d) => {
      const tags = (d.tags ?? []).map((t) => (t.value ?? "").toLowerCase());
      const haystack = [
        d.name?.toLowerCase() ?? "",
        d.description?.toLowerCase() ?? "",
        tags.join(" "),
      ].join(" ");
      const hits = q
        ? tokens.filter((needle) => haystack.includes(needle)).length
        : 1;
      return { d, hits };
    })
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored.map((row) => assetToResult(row.d));
}

export function assetToResult(asset: Asset): AssetSearchResult {
  const file = typeof asset.file === "object" && asset.file ? asset.file : null;
  return {
    id: asset.id,
    name: asset.name,
    description: asset.description,
    tags: (asset.tags ?? []).map((t) => t.value ?? "").filter(Boolean),
    url: file?.url ?? null,
    thumbnailURL: file?.thumbnailURL ?? file?.url ?? null,
  };
}
