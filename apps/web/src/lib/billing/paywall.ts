import { getPayload } from "payload";

import config from "@payload-config";

import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from "@/collections/Subscriptions";
import type { Subscription, User } from "@/payload-types";

import { isBillingBypassed } from "./stripe";

export type PaywallState =
  | { ok: true; reason: "bypass" }
  | { ok: true; reason: "active"; subscription: Subscription }
  | { ok: false; reason: "no_subscription" }
  | { ok: false; reason: "inactive"; status: SubscriptionStatus };

/**
 * Decide whether `user` may use gated features (content-jobs creation).
 * Skips entirely when STRIPE_BYPASS is on so dev / CI never need Stripe creds.
 *
 * Admins / system role always pass — billing exists for customer accounts.
 */
export async function checkPaywall(user: User): Promise<PaywallState> {
  if (isBillingBypassed()) return { ok: true, reason: "bypass" };

  const role = (user as { role?: string }).role;
  if (role === "admin" || role === "system") {
    return { ok: true, reason: "bypass" };
  }

  const payload = await getPayload({ config });
  // Read with overrideAccess so the paywall sees the row even if the
  // user collection's read access ever tightens. Keyed by owner.
  const { docs } = await payload.find({
    collection: "subscriptions",
    overrideAccess: true,
    where: { owner: { equals: user.id } },
    sort: "-updatedAt",
    limit: 1,
    depth: 0,
  });
  const subscription = docs[0] as Subscription | undefined;
  if (!subscription) return { ok: false, reason: "no_subscription" };

  if (
    ACTIVE_SUBSCRIPTION_STATUSES.includes(
      subscription.status as SubscriptionStatus,
    )
  ) {
    return { ok: true, reason: "active", subscription };
  }
  return {
    ok: false,
    reason: "inactive",
    status: subscription.status as SubscriptionStatus,
  };
}

/** Convenience for code paths that just want the boolean answer. */
export async function hasActiveSubscription(user: User): Promise<boolean> {
  const result = await checkPaywall(user);
  return result.ok;
}
