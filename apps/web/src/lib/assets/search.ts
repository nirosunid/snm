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

  const matches = docs.filter((d) => {
    if (!q) return true;
    const tags = (d.tags ?? []).map((t) => (t.value ?? "").toLowerCase());
    const haystack = [
      d.name?.toLowerCase() ?? "",
      d.description?.toLowerCase() ?? "",
      tags.join(" "),
    ].join(" ");
    return q.split(/\s+/).every((needle) => haystack.includes(needle));
  });

  return matches.map((d) => assetToResult(d));
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
