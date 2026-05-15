/**
 * Stripe webhook receiver. Verifies the signature with the
 * STRIPE_WEBHOOKS_SIGNING_SECRET (rejects forged payloads with 400) and
 * upserts subscriptions on the events we care about. Raw body is required
 * for signature verification, so we read the request as text — Next routes
 * preserve the raw bytes for `.text()` even with a JSON content-type.
 *
 * Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
 * then `stripe trigger customer.subscription.updated`.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe, isBillingBypassed, webhookSecret } from "@/lib/billing/stripe";
import {
  markSubscriptionDeleted,
  upsertSubscriptionFromStripe,
} from "@/lib/billing/sync";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isBillingBypassed()) {
    return NextResponse.json(
      { ok: false, error: "STRIPE_BYPASS=1 — webhook ignored." },
      { status: 503 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `Signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // The Checkout session links a customer to a subscription. The
        // subscription itself is what we mirror — fetch and upsert.
        const session = event.data.object as Stripe.Checkout.Session;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscriptionFromStripe(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end": {
        await upsertSubscriptionFromStripe(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await markSubscriptionDeleted(sub.id);
        break;
      }
      default:
        // Unhandled events are a non-event — Stripe replays everything we
        // care about and ignores the rest. 200 keeps the dashboard clean.
        break;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: `Handler failed: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
