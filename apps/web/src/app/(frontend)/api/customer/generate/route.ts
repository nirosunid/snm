import { NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@payload-config";

import {
  brandLikeFromRecord,
  HARDCODED_BRAND,
  type BrandLike,
} from "@/lib/agents/brand";
import { generateDraft } from "@/lib/agents/generate";
import { GenerateRequestSchema } from "@/lib/agents/schemas";
import { currentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let brand: BrandLike = HARDCODED_BRAND;
  let brandId: number | undefined;
  if (parsed.data.brandId !== undefined) {
    const id = Number(parsed.data.brandId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid brandId." }, { status: 400 });
    }
    const payload = await getPayload({ config });
    try {
      const record = await payload.findByID({
        collection: "brands",
        id,
        user,
        overrideAccess: false,
      });
      brand = brandLikeFromRecord(record);
      brandId = id;
    } catch {
      return NextResponse.json(
        { error: "Brand not found." },
        { status: 404 },
      );
    }
  }

  try {
    const response = await generateDraft(parsed.data.topic, brand, { brandId });
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
