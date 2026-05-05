import { sql } from "@payloadcms/db-postgres";
import type { CollectionConfig } from "payload";

import {
  adminOnlyFieldAccess,
  adminOrCustomerOwner,
  isLoggedIn,
} from "@/access";

export const VoiceSamples: CollectionConfig = {
  slug: "voice-samples",
  admin: {
    useAsTitle: "content",
    defaultColumns: ["brand", "source", "model", "createdAt"],
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
        // On create, verify that the supplied brand belongs to the user.
        // (For staff this is unrestricted; the access check below allows it.)
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
          throw new Error("You can only add voice samples to brands you own.");
        }
        return data;
      },
    ],
    afterChange: [
      async ({ req, doc, operation }) => {
        // Mirror the embedding JSON into the parallel pgvector column so
        // similarity queries hit the HNSW index. Embeddings are write-once
        // in MVP-1 (we don't recompute on update), so 'create' is the only
        // operation we need.
        if (operation !== "create") return doc;
        const embedding = (doc as { embedding?: number[] | null }).embedding;
        if (!embedding || embedding.length === 0) return doc;
        const literal = `[${embedding.join(",")}]`;
        await req.payload.db.drizzle.execute(
          sql`UPDATE voice_samples SET embedding_vec = ${literal}::vector WHERE id = ${doc.id}`,
        );
        return doc;
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
      name: "content",
      type: "textarea",
      required: true,
    },
    {
      name: "source",
      type: "select",
      required: true,
      defaultValue: "pasted_sample",
      options: [
        { label: "Brand brief", value: "brief" },
        { label: "Pasted sample", value: "pasted_sample" },
      ],
    },
    {
      name: "model",
      type: "text",
      required: true,
      admin: {
        description: "Embedding model used (e.g. text-embedding-3-small).",
      },
    },
    {
      name: "embedding",
      type: "json",
      required: true,
      admin: {
        hidden: true,
        description:
          "Float array (1536 dims). The matching pgvector column is mirrored automatically via afterChange hook.",
      },
    },
  ],
};
