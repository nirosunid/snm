import type { CollectionConfig } from "payload";

import { adminOnly, isAdmin, isLoggedIn } from "@/access";

/** Slide types that can be rendered. Extend in tandem with the template registry. */
export const TEMPLATE_TYPES = [
  "hook",
  "listicle_item",
  "cta",
  "quote",
  "image_caption",
] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const Templates: CollectionConfig = {
  slug: "templates",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["key", "name", "type", "active"],
    description:
      "Slide template registry. Seeded from code; admins can toggle `active` to retire a template without a code change.",
  },
  access: {
    // Any signed-in user can read (the render endpoint needs to look up
    // active templates), but only admins can mutate.
    create: adminOnly,
    read: isLoggedIn,
    update: adminOnly,
    delete: adminOnly,
    admin: isAdmin,
  },
  fields: [
    {
      name: "key",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "Stable identifier matching a React component in src/render/templates/.",
      },
    },
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "type",
      type: "select",
      required: true,
      options: TEMPLATE_TYPES.map((t) => ({ label: t, value: t })),
      admin: {
        description: "Slide role this template fulfills.",
      },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Inactive templates are skipped by the renderer's per-type lookup.",
      },
    },
  ],
};
