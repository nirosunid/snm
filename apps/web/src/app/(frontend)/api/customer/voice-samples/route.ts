import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/session";
import { ingestVoiceSamples } from "@/lib/voice/ingest";
import { AddVoiceSamplesInput, splitSamples } from "@/lib/voice/schemas";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Accept either { brandId, samples: string[] } or { brandId, paste: string }.
  const raw = body as Record<string, unknown> | null;
  const samples = Array.isArray(raw?.samples)
    ? (raw.samples as unknown[]).map(String)
    : typeof raw?.paste === "string"
      ? splitSamples(raw.paste)
      : [];

  const parsed = AddVoiceSamplesInput.safeParse({
    brandId: raw?.brandId,
    samples,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await ingestVoiceSamples({
    brandId: Number(parsed.data.brandId),
    samples: parsed.data.samples,
    user,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
