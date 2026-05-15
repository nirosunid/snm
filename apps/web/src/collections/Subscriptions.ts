import type { CollectionConfig } from "payload";

import {
  adminOnlyFieldAccess,
  adminOrCustomerOwner,
  isLoggedIn,
} from "@/access";

/** Subset of Stripe's subscription statuses we care about. We map any other
 *  Stripe value (paused, etc.) to "incomplete" before persisting. */
export const SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Statuses that grant access to gated features (content-jobs creation). */
export const ACTIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "active",
  "trialing",
];

export const Subscriptions: CollectionConfig = {
  slug: "subscriptions",
  admin: {
    useAsTitle: "stripeSubscriptionId",
    defaultColumns: [
      "owner",
      "status",
      "currentPeriodEnd",
      "cancelAtPeriodEnd",
      "updatedAt",
    ],
    description:
      "Stripe subscription mirror. One row per (owner, stripeSubscriptionId). Webhook handler keeps this in sync.",
  },
  access: {
    // Customers can read their own row (the dashboard surfaces it). Writes
    // happen via the webhook handler with overrideAccess: true; the field
    // hooks below also lock down the Stripe-side identifiers.
    create: isLoggedIn,
    read: adminOrCustomerOwner,
    update: adminOrCustomerOwner,
    delete: adminOrCustomerOwner,
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: true,
      hasMany: false,
      defaultValue: ({ user }: { user?: { id?: number | string } | null }) =>
        user?.id,
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Stamped automatically from the authenticated user.",
      },
    },
    {
      name: "stripeCustomerId",
      type: "text",
      required: true,
      index: true,
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: { readOnly: true },
    },
    {
      name: "stripeSubscriptionId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: { readOnly: true },
    },
    {
      name: "stripePriceId",
      type: "text",
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: { readOnly: true },
    },
    {
      name: "status",
      type: "select",
      required: true,
      options: SUBSCRIPTION_STATUSES.map((s) => ({ label: s, value: s })),
      defaultValue: "incomplete",
      index: true,
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: { position: "sidebar", readOnly: true },
    },
    {
      name: "currentPeriodEnd",
      type: "date",
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        position: "sidebar",
        readOnly: true,
        description:
          "When the current paid period ends. After this, status drops to canceled / past_due unless renewed.",
      },
    },
    {
      name: "cancelAtPeriodEnd",
      type: "checkbox",
      defaultValue: false,
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        position: "sidebar",
        readOnly: true,
        description:
          "True when the customer asked to cancel — access continues until currentPeriodEnd, then drops.",
      },
    },
  ],
};
