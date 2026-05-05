"use server";

import { getPayload } from "payload";

import config from "@payload-config";

import { currentUser } from "@/lib/auth/session";

import { CreateBrandInput, type CreateBrandInputType } from "./schemas";

export type CreateBrandResult =
  | { ok: true; brandId: number }
  | { ok: false; error: string };

export type SetLogoResult = { ok: true } | { ok: false; error: string };

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

/**
 * Upload a logo to the media collection and attach it to a brand. Run
 * after createBrand so a logo failure doesn't block brand creation.
 */
export async function setBrandLogo(
  formData: FormData,
): Promise<SetLogoResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("file");
  const brandId = Number(formData.get("brandId"));
  if (!Number.isInteger(brandId) || brandId <= 0) {
    return { ok: false, error: "Invalid brandId." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }

  const payload = await getPayload({ config });
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const media = await payload.create({
      collection: "media",
      data: { alt: `${file.name} (brand logo)` },
      file: {
        data: buffer,
        mimetype: file.type || "application/octet-stream",
        name: file.name,
        size: file.size,
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: "brands",
      id: brandId,
      data: { logo: media.id },
      overrideAccess: false,
      user,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Logo upload failed.",
    };
  }
}
