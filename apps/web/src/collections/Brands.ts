import type { CollectionConfig } from "payload";

import {
  adminOnlyFieldAccess,
  adminOrCustomerOwner,
  isLoggedIn,
} from "@/access";

export const FONT_OPTIONS = ["Inter", "Playfair Display", "IBM Plex Sans"] as const;
export type FontOption = (typeof FONT_OPTIONS)[number];

const HEX_COLOR_PATTERN = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$";

export const Brands: CollectionConfig = {
  slug: "brands",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "owner", "updatedAt"],
  },
  access: {
    // Any signed-in user can create; the owner field's defaultValue stamps
    // req.user.id and its create-access strips any client-supplied value, so
    // a customer can't create a brand owned by someone else (mirrors the
    // role-escalation defense on Users).
    create: isLoggedIn,
    read: adminOrCustomerOwner,
    update: adminOrCustomerOwner,
    delete: adminOrCustomerOwner,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
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
      name: "niche",
      type: "text",
      admin: {
        description: "What the brand is about — one line.",
      },
    },
    {
      name: "audience",
      type: "textarea",
      admin: {
        description: "Who the brand talks to.",
      },
    },
    {
      name: "tone",
      type: "textarea",
      admin: {
        description: "How the brand sounds.",
      },
    },
    {
      name: "dos",
      type: "array",
      labels: { singular: "Do", plural: "Dos" },
      fields: [{ name: "item", type: "text", required: true }],
    },
    {
      name: "donts",
      type: "array",
      labels: { singular: "Don't", plural: "Don'ts" },
      fields: [{ name: "item", type: "text", required: true }],
    },
    {
      name: "vocabulary",
      type: "array",
      labels: { singular: "Word", plural: "Vocabulary" },
      admin: {
        description: "Recurring words or phrases this brand uses.",
      },
      fields: [{ name: "item", type: "text", required: true }],
    },
    {
      name: "palette",
      type: "group",
      fields: [
        { name: "primary", type: "text", validate: hexColor },
        { name: "secondary", type: "text", validate: hexColor },
        { name: "accent", type: "text", validate: hexColor },
        { name: "background", type: "text", validate: hexColor },
        { name: "text", type: "text", validate: hexColor },
      ],
    },
    {
      name: "font",
      type: "select",
      defaultValue: "Inter",
      options: FONT_OPTIONS.map((f) => ({ label: f, value: f })),
    },
    {
      name: "logo",
      type: "upload",
      relationTo: "media",
    },
  ],
};

function hexColor(value: unknown): true | string {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string") return "Must be a hex color (e.g. #1A2B3C).";
  return new RegExp(HEX_COLOR_PATTERN).test(value)
    ? true
    : "Must be a hex color (e.g. #1A2B3C).";
}
