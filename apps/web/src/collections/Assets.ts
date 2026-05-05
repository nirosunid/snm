import type { CollectionConfig } from "payload";

import {
  adminOnlyFieldAccess,
  adminOrCustomerOwner,
  isLoggedIn,
} from "@/access";

export const Assets: CollectionConfig = {
  slug: "assets",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "brand", "owner", "createdAt"],
  },
  access: {
    create: isLoggedIn,
    read: adminOrCustomerOwner,
    update: adminOrCustomerOwner,
    delete: adminOrCustomerOwner,
  },
  hooks: {
    beforeValidate: [
      async ({ req, data, operation }) => {
        if (operation !== "create") return data;
        if (!req.user) return data;
        const brandId = data?.brand;
        if (!brandId) return data;
        const role = (req.user as { role?: string }).role;
        if (role === "admin" || role === "system") return data;
        const owned = await req.payload.find({
          collection: "brands",
          where: { id: { equals: brandId }, owner: { equals: req.user.id } },
          limit: 1,
          overrideAccess: true,
          depth: 0,
        });
        if (owned.docs.length === 0) {
          throw new Error("You can only add assets to brands you own.");
        }
        return data;
      },
    ],
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
      name: "name",
      type: "text",
      required: true,
      admin: {
        description: "Display name (defaults to the original filename on upload).",
      },
    },
    {
      name: "file",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "tags",
      type: "array",
      labels: { singular: "Tag", plural: "Tags" },
      admin: {
        description: "Searchable terms — what's in the photo, mood, product, etc.",
      },
      fields: [{ name: "value", type: "text", required: true }],
    },
    {
      name: "description",
      type: "textarea",
      admin: {
        description:
          "Optional caption / context the AI can read when picking this asset.",
      },
    },
  ],
};
