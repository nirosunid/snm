import type { CollectionConfig } from "payload";

import {
  adminOnlyFieldAccess,
  adminOrCustomerOwner,
  isLoggedIn,
} from "@/access";
import { encryptToken } from "@/lib/crypto/tokens";

export const PLATFORMS = ["instagram"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Account types we accept. Personal is refused at OAuth callback time and
 *  therefore never persisted. */
export const ACCEPTED_ACCOUNT_TYPES = ["business", "media_creator"] as const;
export type AcceptedAccountType = (typeof ACCEPTED_ACCOUNT_TYPES)[number];

export const Accounts: CollectionConfig = {
  slug: "accounts",
  admin: {
    useAsTitle: "username",
    defaultColumns: ["username", "platform", "accountType", "brand", "updatedAt"],
    description:
      "Social-platform accounts a customer has connected. One row per (brand, platform, platformUserId). Tokens are encrypted at rest — they're never returned to the admin UI in cleartext.",
  },
  access: {
    create: isLoggedIn,
    read: adminOrCustomerOwner,
    update: adminOrCustomerOwner,
    delete: adminOrCustomerOwner,
  },
  fields: [
    {
      name: "brand",
      type: "relationship",
      relationTo: "brands",
      required: true,
      hasMany: false,
      index: true,
    },
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: true,
      hasMany: false,
      defaultValue: ({ user }: { user?: { id?: number | string } | null }) => user?.id,
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
      name: "platform",
      type: "select",
      required: true,
      options: PLATFORMS.map((p) => ({ label: p, value: p })),
      defaultValue: "instagram",
      index: true,
    },
    {
      name: "platformUserId",
      type: "text",
      required: true,
      index: true,
      admin: {
        description:
          "The platform-side user id (e.g. Instagram's numeric user id).",
      },
    },
    {
      name: "username",
      type: "text",
      required: true,
      admin: {
        description: "Display handle (e.g. @example).",
      },
    },
    {
      name: "accountType",
      type: "select",
      required: true,
      options: ACCEPTED_ACCOUNT_TYPES.map((t) => ({ label: t, value: t })),
      admin: {
        description:
          "Instagram account type. Personal accounts are refused at OAuth time and never persisted here.",
      },
    },
    {
      name: "accessToken",
      type: "text",
      required: true,
      hooks: {
        // Always encrypt on the way in. `encryptToken` is idempotent so it's
        // safe to run on already-encrypted values.
        beforeChange: [({ value }) => (value ? encryptToken(String(value)) : value)],
      },
      access: {
        // Customers and admins can read the encrypted blob via overrideAccess
        // in server-side code paths (publish, refresh). The admin UI surfaces
        // it but only after decrypt via afterRead in code that needs it.
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
        read: adminOnlyFieldAccess,
      },
      admin: {
        readOnly: true,
        description: "Encrypted at rest. Never edit by hand.",
      },
    },
    {
      name: "tokenExpiresAt",
      type: "date",
      admin: {
        position: "sidebar",
        description:
          "When the stored token expires. Long-lived IG tokens are valid ~60 days; the refresh job extends them as the deadline nears.",
      },
    },
    {
      name: "connectedAt",
      type: "date",
      admin: {
        position: "sidebar",
        readOnly: true,
        description: "Set on initial OAuth callback success.",
      },
    },
  ],
};
