"use server";

import { currentUser } from "@/lib/auth/session";

import { ingestVoiceSamples, type IngestResult } from "./ingest";
import { AddVoiceSamplesInput, splitSamples } from "./schemas";

export async function addVoiceSamplesFromPaste({
  brandId,
  paste,
}: {
  brandId: number | string;
  paste: string;
}): Promise<IngestResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const samples = splitSamples(paste);
  if (samples.length === 0) {
    return { ok: false, error: "Paste at least one sample." };
  }

  const parsed = AddVoiceSamplesInput.safeParse({ brandId, samples });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" "),
    };
  }

  return ingestVoiceSamples({
    brandId: Number(parsed.data.brandId),
    samples: parsed.data.samples,
    user,
  });
}
