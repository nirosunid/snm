import { getPayload } from "payload";

import config from "@payload-config";

import { embedTexts } from "@/lib/agents/embed";
import type { User } from "@/payload-types";

export type IngestResult =
  | { ok: true; created: number; model: string }
  | { ok: false; error: string };

/**
 * Embed and persist voice samples for a brand. Synchronous: a 10-20-sample
 * paste embeds in ~2 seconds; the deferred Celery/RabbitMQ stack is the
 * natural home for backgrounding this if it ever needs to scale beyond
 * small interactive pastes.
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
  let created = 0;
  for (let i = 0; i < samples.length; i++) {
    try {
      await payload.create({
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
      created++;
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof Error
            ? `Persisted ${created} of ${samples.length} samples before failing: ${e.message}`
            : `Persisted ${created} of ${samples.length} samples before failing.`,
      };
    }
  }

  return { ok: true, created, model };
}
