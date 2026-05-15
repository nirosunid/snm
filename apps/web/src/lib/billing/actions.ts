"use server";

import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth/session";

import { createCheckoutUrl, createCustomerPortalUrl } from "./sessions";
import { isBillingBypassed } from "./stripe";

export async function startCheckout(): Promise<void> {
  if (isBillingBypassed()) {
    throw new Error(
      "Billing is bypassed (STRIPE_BYPASS=1). Disable bypass to test the Stripe Checkout flow.",
    );
  }
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  const url = await createCheckoutUrl(user);
  // Server actions can redirect — Next handles the 303 across the form post.
  redirect(url);
}

export async function openCustomerPortal(): Promise<void> {
  if (isBillingBypassed()) {
    throw new Error(
      "Billing is bypassed (STRIPE_BYPASS=1). Disable bypass to open the customer portal.",
    );
  }
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  const url = await createCustomerPortalUrl(user);
  redirect(url);
}
