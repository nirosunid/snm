import { getPayload } from "payload";

import config from "@payload-config";

import type { Subscription, User } from "@/payload-types";
import { routes } from "@/lib/routes";

import { getStripe, priceId } from "./stripe";

/**
 * Find or create the Stripe customer for `user`. We don't have a dedicated
 * column for stripeCustomerId on the user — it lives on the subscription
 * row, so a returning customer who reactivates after canceling reuses the
 * same Stripe customer record.
 */
async function findOrCreateStripeCustomerId(user: User): Promise<string> {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "subscriptions",
    overrideAccess: true,
    where: { owner: { equals: user.id } },
    sort: "-updatedAt",
    limit: 1,
    depth: 0,
  });
  const existing = docs[0] as Subscription | undefined;
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: { userId: String(user.id) },
  });
  return customer.id;
}

function origin(): string {
  return (
    process.env.NEXT_PUBLIC_SERVER_URL ??
    process.env.PAYLOAD_PUBLIC_SERVER_URL ??
    "http://localhost:3000"
  );
}

export async function createCheckoutUrl(user: User): Promise<string> {
  const stripe = getStripe();
  const customer = await findOrCreateStripeCustomerId(user);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceId(), quantity: 1 }],
    success_url: `${origin()}${routes.customer.dashboard()}?billing=success`,
    cancel_url: `${origin()}${routes.customer.dashboard()}?billing=canceled`,
    allow_promotion_codes: true,
    metadata: { userId: String(user.id) },
    subscription_data: {
      metadata: { userId: String(user.id) },
    },
  });
  if (!session.url) throw new Error("Stripe Checkout did not return a URL.");
  return session.url;
}

export async function createCustomerPortalUrl(user: User): Promise<string> {
  const stripe = getStripe();
  const customer = await findOrCreateStripeCustomerId(user);
  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${origin()}${routes.customer.dashboard()}`,
  });
  return session.url;
}
