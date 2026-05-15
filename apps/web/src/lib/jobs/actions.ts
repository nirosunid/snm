"use server";

import { revalidatePath } from "next/cache";
import { headers as nextHeaders } from "next/headers";
import { getPayload } from "payload";

import config from "@payload-config";

import { DraftPayloadSchema, type DraftPayload } from "@/lib/agents/schemas";
import { currentUser } from "@/lib/auth/session";
import { decryptToken } from "@/lib/crypto/tokens";
import { isMockMode } from "@/lib/instagram/oauth";
import { publishCarousel } from "@/lib/instagram/publish";
import { routes } from "@/lib/routes";
import type { Account } from "@/payload-types";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type PublishActionResult =
  | { ok: true; mediaId: string; permalink: string | null }
  | { ok: false; error: string };

async function loadJob(jobId: number, user: { id: number | string }) {
  const payload = await getPayload({ config });
  return payload.findByID({
    collection: "content-jobs",
    id: jobId,
    user: user as Parameters<typeof payload.findByID>[0]["user"],
    overrideAccess: false,
    depth: 0,
  });
}

export async function saveDraftEdits({
  jobId,
  draft,
}: {
  jobId: number;
  draft: unknown;
}): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = DraftPayloadSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(" "),
    };
  }

  const payload = await getPayload({ config });
  let job;
  try {
    job = await loadJob(jobId, user);
  } catch {
    return { ok: false, error: "Job not found." };
  }
  if (job.status !== "ready") {
    return {
      ok: false,
      error: `Only ready jobs can be edited (current status: ${job.status}).`,
    };
  }

  await payload.update({
    collection: "content-jobs",
    id: jobId,
    data: { draftPayload: parsed.data as unknown as DraftPayload },
    user,
    overrideAccess: false,
  });

  const brandId =
    typeof job.brand === "object" && job.brand
      ? (job.brand as { id: number }).id
      : (job.brand as number);
  revalidatePath(routes.customer.brands.queueJob(brandId, jobId));
  revalidatePath(routes.customer.brands.queue(brandId));
  return { ok: true };
}

export async function approveJob({
  jobId,
}: {
  jobId: number;
}): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const payload = await getPayload({ config });
  let job;
  try {
    job = await loadJob(jobId, user);
  } catch {
    return { ok: false, error: "Job not found." };
  }
  if (job.status !== "ready") {
    return {
      ok: false,
      error: `Only ready jobs can be approved (current status: ${job.status}).`,
    };
  }

  await payload.update({
    collection: "content-jobs",
    id: jobId,
    data: { status: "approved" },
    user,
    overrideAccess: false,
  });

  const brandId =
    typeof job.brand === "object" && job.brand
      ? (job.brand as { id: number }).id
      : (job.brand as number);
  revalidatePath(routes.customer.brands.queueJob(brandId, jobId));
  revalidatePath(routes.customer.brands.queue(brandId));
  return { ok: true };
}

/**
 * Approve + publish in one server-side step.
 *
 * Idempotent: a job whose `publishedMediaId` is already set is treated as a
 * success without re-calling Meta. The Approve+Publish button can therefore
 * be safely re-clicked after a refresh.
 */
export async function publishJob({
  jobId,
  accountId,
}: {
  jobId: number;
  accountId: number;
}): Promise<PublishActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const payload = await getPayload({ config });

  let job;
  try {
    job = await loadJob(jobId, user);
  } catch {
    return { ok: false, error: "Job not found." };
  }
  if (job.publishedMediaId) {
    return {
      ok: true,
      mediaId: String(job.publishedMediaId),
      permalink: null,
    };
  }
  if (job.status !== "ready" && job.status !== "approved") {
    return {
      ok: false,
      error: `Only ready/approved jobs can be published (current status: ${job.status}).`,
    };
  }
  const draft = DraftPayloadSchema.safeParse(job.draftPayload);
  if (!draft.success) {
    return {
      ok: false,
      error: "Job has no valid draft to publish.",
    };
  }

  // Load the account through customer-scoped access — confirms ownership.
  // The accessToken field is admin-only at the field-level, so we re-fetch
  // it with overrideAccess to get the cleartext value for the publish call.
  let account: Account;
  try {
    account = (await payload.findByID({
      collection: "accounts",
      id: accountId,
      user,
      overrideAccess: false,
      depth: 0,
    })) as Account;
  } catch {
    return { ok: false, error: "Account not found or not owned by you." };
  }
  const brandId =
    typeof job.brand === "object" && job.brand
      ? (job.brand as { id: number }).id
      : (job.brand as number);
  const accountBrandId =
    typeof account.brand === "object" && account.brand
      ? (account.brand as { id: number }).id
      : (account.brand as number);
  if (accountBrandId !== brandId) {
    return {
      ok: false,
      error: "Account does not belong to this job's brand.",
    };
  }
  if (account.platform !== "instagram") {
    return {
      ok: false,
      error: `Publishing to ${account.platform} is not supported in MVP-1.`,
    };
  }

  const tokenRow = (await payload.findByID({
    collection: "accounts",
    id: accountId,
    overrideAccess: true,
    depth: 0,
  })) as Account;
  const accessToken = decryptToken(tokenRow.accessToken);

  // Move to approved before publishing so a mid-flight crash leaves the row
  // in a recoverable state (the customer can re-hit Publish from the editor).
  if (job.status !== "approved") {
    await payload.update({
      collection: "content-jobs",
      id: jobId,
      data: { status: "approved" },
      user,
      overrideAccess: false,
    });
  }

  // Resolve image URLs the IG fetcher can reach. Asset slides already carry
  // their imageUrl (Payload media URL); templated slides need to be hit via
  // the render endpoint with the brand context. Both must be absolute.
  const origin = await resolveOrigin();
  const slides = draft.data.slides.map((s) => ({
    imageUrl: absolutizeUrl(
      s.imageUrl ??
        routes.api.customer.render({
          type: s.type,
          copy: s.copy,
          brandId,
        }),
      origin,
    ),
  }));

  const captionWithHashtags = [
    draft.data.caption,
    draft.data.hashtags
      .map((t) => `#${t.replace(/^#/, "")}`)
      .join(" "),
  ]
    .filter((s) => s.trim().length > 0)
    .join("\n\n");

  let result: { mediaId: string; permalink: string | null };
  try {
    result = await publishCarousel({
      igUserId: account.platformUserId,
      accessToken,
      caption: captionWithHashtags,
      slides,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await payload.update({
      collection: "content-jobs",
      id: jobId,
      data: { status: "failed", error: message },
      user,
      overrideAccess: false,
    });
    revalidatePath(routes.customer.brands.queueJob(brandId, jobId));
    revalidatePath(routes.customer.brands.queue(brandId));
    return { ok: false, error: message };
  }

  await payload.update({
    collection: "content-jobs",
    id: jobId,
    data: {
      status: "published",
      account: accountId,
      publishedAt: new Date().toISOString(),
      publishedMediaId: result.mediaId,
      error: null,
    },
    user,
    overrideAccess: false,
  });

  revalidatePath(routes.customer.brands.queueJob(brandId, jobId));
  revalidatePath(routes.customer.brands.queue(brandId));
  return { ok: true, mediaId: result.mediaId, permalink: result.permalink };
}

/** Best-effort: resolve the public origin so render-endpoint URLs are absolute
 *  (required by Meta's image fetcher). Falls back to NEXT_PUBLIC_SERVER_URL. */
async function resolveOrigin(): Promise<string> {
  // In mock mode the URL never gets fetched; any non-empty origin works and
  // we can skip the headers() call (which costs a sync request boundary).
  if (isMockMode()) return "https://mock.local";
  const fromEnv =
    process.env.NEXT_PUBLIC_SERVER_URL ?? process.env.PAYLOAD_PUBLIC_SERVER_URL;
  if (fromEnv) return fromEnv;
  const headers = await nextHeaders();
  const proto = headers.get("x-forwarded-proto") ?? "http";
  const host = headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function absolutizeUrl(url: string, origin: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const trimmed = origin.replace(/\/$/, "");
  return url.startsWith("/") ? `${trimmed}${url}` : `${trimmed}/${url}`;
}

export async function discardJob({
  jobId,
}: {
  jobId: number;
}): Promise<ActionResult & { brandId?: number }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const payload = await getPayload({ config });
  let job;
  try {
    job = await loadJob(jobId, user);
  } catch {
    return { ok: false, error: "Job not found." };
  }

  const brandId =
    typeof job.brand === "object" && job.brand
      ? (job.brand as { id: number }).id
      : (job.brand as number);

  await payload.delete({
    collection: "content-jobs",
    id: jobId,
    user,
    overrideAccess: false,
  });

  revalidatePath(routes.customer.brands.queue(brandId));
  return { ok: true, brandId };
}
