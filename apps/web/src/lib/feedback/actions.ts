"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import config from "@payload-config";

import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export type FeedbackResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function submitFeedback({
  jobId,
  rating,
  notes,
}: {
  jobId: number;
  rating: number;
  notes?: string;
}): Promise<FeedbackResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Rating must be 1-5." };
  }

  const payload = await getPayload({ config });
  // Confirm the caller owns the job through the customer-scoped read; the
  // create below will then succeed under the same access predicate.
  let job;
  try {
    job = await payload.findByID({
      collection: "content-jobs",
      id: jobId,
      user,
      overrideAccess: false,
      depth: 0,
    });
  } catch {
    return { ok: false, error: "Job not found or not owned by you." };
  }

  // One feedback row per (owner, job). If the user already left feedback,
  // update the existing row in place so the founder sees their latest
  // opinion (not a stack of revisions).
  const { docs: existing } = await payload.find({
    collection: "feedback",
    overrideAccess: true,
    where: { owner: { equals: user.id }, job: { equals: jobId } },
    limit: 1,
    depth: 0,
  });

  let id: number;
  if (existing.length > 0) {
    const updated = await payload.update({
      collection: "feedback",
      id: existing[0].id,
      data: { rating, notes: notes?.trim() || undefined },
      user,
      overrideAccess: false,
    });
    id = updated.id;
  } else {
    const created = await payload.create({
      collection: "feedback",
      data: {
        job: jobId,
        owner: user.id,
        rating,
        notes: notes?.trim() || undefined,
      },
      user,
      overrideAccess: false,
    });
    id = created.id;
  }

  const brandId =
    typeof job.brand === "object" && job.brand
      ? (job.brand as { id: number }).id
      : (job.brand as number);
  revalidatePath(routes.customer.brands.queueJob(brandId, jobId));
  return { ok: true, id };
}
