import type { CollectionConfig } from "payload";

import {
  adminOnlyFieldAccess,
  adminOrCustomerOwner,
  isLoggedIn,
} from "@/access";

export const CONTENT_JOB_STATUSES = [
  "queued",
  "generating",
  "ready",
  "approved",
  "published",
  "failed",
] as const;
export type ContentJobStatus = (typeof CONTENT_JOB_STATUSES)[number];

export const ContentJobs: CollectionConfig = {
  slug: "content-jobs",
  admin: {
    useAsTitle: "topic",
    defaultColumns: ["topic", "brand", "status", "createdAt"],
    description:
      "One row per generation request. The pipeline writes status transitions and the final draftPayload.",
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
          throw new Error("You can only create content jobs for brands you own.");
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
      name: "topic",
      type: "text",
      required: true,
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "queued",
      options: CONTENT_JOB_STATUSES.map((s) => ({ label: s, value: s })),
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "inputPayload",
      type: "json",
      admin: {
        description:
          "The original generation request (topic, options). Snapshot for replay/debugging.",
      },
    },
    {
      name: "draftPayload",
      type: "json",
      admin: {
        description:
          "The pipeline's final DraftPayload (slides + caption + hashtags). Populated when status = ready.",
      },
    },
    {
      name: "review",
      type: "json",
      admin: {
        description:
          "Reviewer stage output: { verdict, issues, cta_present, revisionsRun }. Populated when status = ready.",
      },
    },
    {
      name: "error",
      type: "textarea",
      admin: {
        description: "Last error message — populated when status = failed.",
      },
    },
    {
      name: "provider",
      type: "text",
      admin: { description: "LLM provider used (e.g. ollama, anthropic)." },
    },
    {
      name: "model",
      type: "text",
      admin: { description: "LLM model used." },
    },
    {
      name: "voiceSamplesUsed",
      type: "number",
      defaultValue: 0,
    },
    {
      name: "costCents",
      type: "number",
      admin: {
        description:
          "LLM + image cost for this generation, populated by the reviewer stage in #10.",
      },
    },
    {
      name: "account",
      type: "relationship",
      relationTo: "accounts",
      hasMany: false,
      admin: {
        position: "sidebar",
        description:
          "Account this job was published to. Set by the publish action; null for unpublished jobs.",
      },
    },
    {
      name: "publishedAt",
      type: "date",
      admin: {
        position: "sidebar",
        description: "Set when status transitions to published.",
      },
    },
    {
      name: "publishedMediaId",
      type: "text",
      admin: {
        description:
          "Platform-side media id returned by media_publish. Used as the idempotency key — a job with this set won't be republished.",
      },
    },
  ],
};
