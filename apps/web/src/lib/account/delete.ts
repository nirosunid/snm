import "server-only";

import { getPayload } from "payload";

import config from "@payload-config";

export type DeletionSummary = {
  contentJobs: number;
  accounts: number;
  voiceSamples: number;
  assets: number;
  brands: number;
  subscriptions: number;
  media: number;
  user: 1 | 0;
};

/**
 * Cascade-delete every record owned by `userId`. Order matters because of
 * foreign-key references — children before parents.
 *
 * Always runs with `overrideAccess: true` because the calling user may not
 * have direct access to every collection (the typical caller is the
 * authenticated user themselves; an admin can also invoke this on behalf of
 * a customer per a deletion request).
 *
 * Idempotent: deleting a user that's already been partially deleted just
 * reports zero counts for what was already gone.
 */
export async function deleteAccountCascade(
  userId: number,
): Promise<DeletionSummary> {
  const payload = await getPayload({ config });

  const summary: DeletionSummary = {
    contentJobs: 0,
    accounts: 0,
    voiceSamples: 0,
    assets: 0,
    brands: 0,
    subscriptions: 0,
    media: 0,
    user: 0,
  };

  // Children first. content-jobs reference both brand and (optionally) account,
  // so they go before either parent.
  summary.contentJobs = await deleteAllByOwner(payload, "content-jobs", userId);
  summary.accounts = await deleteAllByOwner(payload, "accounts", userId);
  summary.voiceSamples = await deleteAllByOwner(payload, "voice-samples", userId);
  summary.assets = await deleteAllByOwner(payload, "assets", userId);
  summary.brands = await deleteAllByOwner(payload, "brands", userId);
  summary.subscriptions = await deleteAllByOwner(payload, "subscriptions", userId);

  // Media is owned by uploader (no `owner` field — Payload's default is
  // `createdBy` style). We approximate by querying media uploaded by this
  // user via the createdBy relation if it exists; otherwise we leave it.
  summary.media = await deleteMediaByUploader(payload, userId);

  try {
    await payload.delete({
      collection: "users",
      id: userId,
      overrideAccess: true,
    });
    summary.user = 1;
  } catch {
    summary.user = 0;
  }

  return summary;
}

async function deleteAllByOwner(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: Parameters<typeof payload.delete>[0]["collection"],
  ownerId: number,
): Promise<number> {
  // Page through to handle accounts with > 100 owned rows. Payload's bulk
  // delete by `where` is efficient but doesn't return a useful count, so
  // we count via find first.
  const { totalDocs } = await payload.find({
    collection,
    overrideAccess: true,
    where: { owner: { equals: ownerId } },
    limit: 0,
    depth: 0,
  });
  if (totalDocs === 0) return 0;
  await payload.delete({
    collection,
    overrideAccess: true,
    where: { owner: { equals: ownerId } },
  });
  return totalDocs;
}

async function deleteMediaByUploader(
  payload: Awaited<ReturnType<typeof getPayload>>,
  userId: number,
): Promise<number> {
  // Payload's Users-as-uploader convention varies per project. Try the
  // common shapes; if none match, leave media alone (operator can clean
  // up via the admin UI).
  for (const field of ["uploadedBy", "owner", "createdBy"] as const) {
    try {
      const { totalDocs } = await payload.find({
        collection: "media",
        overrideAccess: true,
        where: { [field]: { equals: userId } },
        limit: 0,
        depth: 0,
      });
      if (totalDocs === 0) continue;
      await payload.delete({
        collection: "media",
        overrideAccess: true,
        where: { [field]: { equals: userId } },
      });
      return totalDocs;
    } catch {
      // Field doesn't exist on the collection — try the next.
      continue;
    }
  }
  return 0;
}
