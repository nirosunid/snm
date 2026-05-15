import "server-only";

import { getPayload } from "payload";
import type Stripe from "stripe";

import config from "@payload-config";

import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from "@/collections/Subscriptions";
import type { Subscription } from "@/payload-types";

/**
 * Mirror a Stripe Subscription into our Payload `subscriptions` collection.
 * Idempotent: looks up the row by stripeSubscriptionId, updates it in place,
 * or creates it on first sight. Owner is derived from the subscription's
 * metadata.userId (set when we minted the Checkout session).
 */
export async function upsertSubscriptionFromStripe(
  sub: Stripe.Subscription,
): Promise<void> {
  const payload = await getPayload({ config });
  const owner = ownerFromMetadata(sub);
  if (!owner) {
    // Skip rather than throw — webhooks retry; without an owner we can't
    // safely persist. Logging via console is fine here (Payload's logger
    // also captures it via the wrapping route handler).
    console.warn(
      `[stripe sync] subscription ${sub.id} has no metadata.userId; skipping.`,
    );
    return;
  }

  // Stripe v22 moved current_period_end to the per-item level (the API now
  // supports per-item billing schedules). For our single-price product the
  // first item's value is the right one.
  const periodEndUnix = sub.items.data[0]?.current_period_end ?? null;

  const data: Partial<Subscription> = {
    owner,
    stripeCustomerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? null,
    status: normalizeStatus(sub.status),
    currentPeriodEnd: periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  };

  const { docs } = await payload.find({
    collection: "subscriptions",
    overrideAccess: true,
    where: { stripeSubscriptionId: { equals: sub.id } },
    limit: 1,
    depth: 0,
  });
  const existing = docs[0] as Subscription | undefined;
  if (existing) {
    await payload.update({
      collection: "subscriptions",
      id: existing.id,
      data,
      overrideAccess: true,
    });
  } else {
    await payload.create({
      collection: "subscriptions",
      data: data as Subscription,
      overrideAccess: true,
    });
  }
}

/** Mark a subscription canceled by id. Used when Stripe deletes one entirely. */
export async function markSubscriptionDeleted(
  stripeSubscriptionId: string,
): Promise<void> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "subscriptions",
    overrideAccess: true,
    where: { stripeSubscriptionId: { equals: stripeSubscriptionId } },
    limit: 1,
    depth: 0,
  });
  const existing = docs[0] as Subscription | undefined;
  if (!existing) return;
  await payload.update({
    collection: "subscriptions",
    id: existing.id,
    data: { status: "canceled", cancelAtPeriodEnd: false },
    overrideAccess: true,
  });
}

function ownerFromMetadata(sub: Stripe.Subscription): number | null {
  const raw = sub.metadata?.userId;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(s)
    ? (s as SubscriptionStatus)
    : "incomplete";
}
