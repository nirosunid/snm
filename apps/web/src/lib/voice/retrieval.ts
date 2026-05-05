import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";

import config from "@payload-config";

import { embedText, toPgVector } from "@/lib/agents/embed";

/**
 * Top-K most stylistically similar voice samples for a brand, ordered by
 * cosine distance against the query text's embedding. Hits the HNSW index
 * on voice_samples.embedding_vec.
 *
 * Returns [] when the brand has no samples (or when called with brandId
 * undefined — e.g. the playground brand).
 */
export async function getBrandVoice(
  brandId: number | undefined,
  queryText: string,
  k = 5,
): Promise<string[]> {
  if (!brandId || !queryText.trim()) return [];

  const payload = await getPayload({ config });

  // Skip the embed call entirely if the brand has no samples — saves an
  // API round-trip and avoids surfacing embed-provider errors on brands
  // that wouldn't have produced retrieval results anyway.
  const countRes = await payload.db.drizzle.execute(sql`
    SELECT count(*)::int AS n FROM voice_samples WHERE brand_id = ${brandId}
  `);
  const n =
    (countRes as unknown as { rows?: Array<{ n: number }> }).rows?.[0]?.n ?? 0;
  if (n === 0) return [];

  const { embedding } = await embedText(queryText);
  const vec = toPgVector(embedding);

  const result = await payload.db.drizzle.execute(sql`
    SELECT content
    FROM voice_samples
    WHERE brand_id = ${brandId}
    ORDER BY embedding_vec <=> ${vec}::vector
    LIMIT ${k};
  `);

  const rows =
    (result as unknown as { rows?: Array<{ content: string }> }).rows ?? [];
  return rows.map((r) => r.content);
}
