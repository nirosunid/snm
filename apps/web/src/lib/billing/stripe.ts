import "server-only";

import Stripe from "stripe";

let cached: Stripe | null = null;

/** True when STRIPE_BYPASS=1 — paywall is open and Stripe calls are skipped.
 *  Required default for first-run dev / CI; MUST be off in production. */
export function isBillingBypassed(): boolean {
  return process.env.STRIPE_BYPASS === "1";
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || secret.startsWith("sk_test_replace")) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Either configure Stripe or set STRIPE_BYPASS=1 in dev.",
    );
  }
  cached = new Stripe(secret);
  return cached;
}

export function priceId(): string {
  const id = process.env.STRIPE_PRO_PRICE_ID;
  if (!id || id.startsWith("price_replace")) {
    throw new Error("STRIPE_PRO_PRICE_ID is not set.");
  }
  return id;
}

export function webhookSecret(): string {
  const v = process.env.STRIPE_WEBHOOKS_SIGNING_SECRET;
  if (!v || v.startsWith("whsec_replace")) {
    throw new Error("STRIPE_WEBHOOKS_SIGNING_SECRET is not set.");
  }
  return v;
}
