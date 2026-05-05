"use server";

import { getPayload } from "payload";

import config from "@payload-config";

import { currentUser } from "@/lib/auth/session";

import { CreateBrandInput, type CreateBrandInputType } from "./schemas";

export type CreateBrandResult =
  | { ok: true; brandId: number }
  | { ok: false; error: string };

export async function createBrand(
  raw: CreateBrandInputType,
): Promise<CreateBrandResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = CreateBrandInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" "),
    };
  }

  const data = parsed.data;
  const payload = await getPayload({ config });

  try {
    const created = await payload.create({
      collection: "brands",
      data: {
        name: data.name,
        // owner is stamped by the field's defaultValue (req.user.id) and the
        // field's create-access strips any client-supplied value, so passing
        // user.id here is just to satisfy the typed required-field contract.
        owner: user.id,
        niche: data.niche || undefined,
        audience: data.audience || undefined,
        tone: data.tone || undefined,
        dos: data.dos.map((item) => ({ item })),
        donts: data.donts.map((item) => ({ item })),
        vocabulary: data.vocabulary.map((item) => ({ item })),
        palette: data.palette,
        font: data.font,
      },
      overrideAccess: false,
      user,
    });
    return { ok: true, brandId: created.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create brand.",
    };
  }
}
