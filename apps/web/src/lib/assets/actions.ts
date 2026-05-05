"use server";

import { getPayload } from "payload";

import config from "@payload-config";

import { currentUser } from "@/lib/auth/session";

export type UploadResult =
  | { ok: true; assetId: number }
  | { ok: false; error: string };

/**
 * Upload one file to the media collection then create an `assets` row that
 * points at it. The brand-ownership check happens inside the assets
 * `beforeValidate` hook (same pattern as voice-samples).
 */
export async function uploadAsset(
  formData: FormData,
): Promise<UploadResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("file");
  const brandIdRaw = formData.get("brandId");
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const nameOverride = String(formData.get("name") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }
  const brandId = Number(brandIdRaw);
  if (!Number.isInteger(brandId) || brandId <= 0) {
    return { ok: false, error: "Invalid brandId." };
  }

  const tags = tagsRaw
    .split(/[,\n]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  const payload = await getPayload({ config });

  // Persist the binary into the `media` collection. Payload accepts a
  // standards `File` (Web API) directly via the `file` option in v3.
  const buffer = Buffer.from(await file.arrayBuffer());
  let mediaId: number;
  try {
    const media = await payload.create({
      collection: "media",
      data: { alt: nameOverride || file.name },
      file: {
        data: buffer,
        mimetype: file.type || "application/octet-stream",
        name: file.name,
        size: file.size,
      },
      // Media is a generic upload collection (logo, asset bytes, slide PNGs).
      // We don't gate it per-customer here; access is enforced on the
      // owning collection (assets / brands / voice-samples / etc.).
      overrideAccess: true,
    });
    mediaId = media.id;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? `Media upload failed: ${e.message}` : "Media upload failed.",
    };
  }

  try {
    const created = await payload.create({
      collection: "assets",
      data: {
        brand: brandId,
        owner: user.id,
        name: nameOverride || file.name,
        file: mediaId,
        tags: tags.map((value) => ({ value })),
        description: description || undefined,
      },
      overrideAccess: false,
      user,
    });
    return { ok: true, assetId: created.id };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Failed to create asset row.",
    };
  }
}
