import { sql } from "@payloadcms/db-postgres";
import { getPayload } from "payload";

import config from "@payload-config";

import { embedTexts, toPgVector } from "@/lib/agents/embed";
import type { User } from "@/payload-types";

export type IngestResult =
  | { ok: true; created: number; model: string }
  | { ok: false; error: string };

/**
 * Embed and persist voice samples for a brand. Synchronous: a 10-20-sample
 * paste embeds in ~2 seconds.
 *
 * Two-phase write — Payload owns the JSON `embedding` column (and access
 * scoping); a follow-up raw SQL UPDATE mirrors the array into the parallel
 * pgvector `embedding_vec` column so similarity queries hit the HNSW index.
 * Done outside the create transaction to avoid the v3 hook visibility
 * issue (a hook's drizzle.execute can't see the uncommitted row).
 */
export async function ingestVoiceSamples({
  brandId,
  samples,
  user,
}: {
  brandId: number;
  samples: string[];
  user: User;
}): Promise<IngestResult> {
  if (samples.length === 0) {
    return { ok: false, error: "No samples to ingest." };
  }

  const { embeddings, model } = await embedTexts(samples);
  if (embeddings.length !== samples.length) {
    return {
      ok: false,
      error: `Embedding count mismatch (got ${embeddings.length} for ${samples.length} samples).`,
    };
  }

  const payload = await getPayload({ config });
  const createdIds: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    try {
      const created = await payload.create({
        collection: "voice-samples",
        data: {
          brand: brandId,
          // owner is stamped by the field's defaultValue from req.user.id;
          // we send it for the typed required-field contract.
          owner: user.id,
          content: samples[i],
          source: "pasted_sample",
          model,
          embedding: embeddings[i],
        },
        overrideAccess: false,
        user,
      });
      createdIds.push(created.id);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const cleaned = raw.split(/\nparams:/)[0].trim();
      return {
        ok: false,
        error: `Persisted ${createdIds.length} of ${samples.length} samples before failing: ${cleaned}`,
      };
    }
  }

  // Mirror the embeddings into the parallel pgvector column. One UPDATE per
  // row — small enough that a batch CTE isn't worth the complexity for
  // 10-20-sample pastes; can be optimized later.
  for (let i = 0; i < createdIds.length; i++) {
    const vec = toPgVector(embeddings[i]);
    await payload.db.drizzle.execute(
      sql`UPDATE voice_samples SET embedding_vec = ${vec}::vector WHERE id = ${createdIds[i]}`,
    );
  }

  return { ok: true, created: createdIds.length, model };
}
