"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import config from "@payload-config";

import { DraftPayloadSchema, type DraftPayload } from "@/lib/agents/schemas";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export type ActionResult =
  | { ok: true }
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
