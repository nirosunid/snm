import type { CollectionConfig } from "payload";

import {
  adminOnlyFieldAccess,
  adminOrCustomerOwner,
  isLoggedIn,
} from "@/access";

/** 1-5 star quality rating + optional notes per content job. The founder /
 *  admin view aggregates these to drive prompt-tuning iterations during the
 *  private beta (Issue #19). */
export const FEEDBACK_RATINGS = [1, 2, 3, 4, 5] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const Feedback: CollectionConfig = {
  slug: "feedback",
  admin: {
    useAsTitle: "rating",
    defaultColumns: ["job", "rating", "owner", "createdAt"],
    description:
      "Per-content-job quality feedback. Drives prompt-tuning iterations during the private beta.",
  },
  access: {
    create: isLoggedIn,
    read: adminOrCustomerOwner,
    update: adminOrCustomerOwner,
    delete: adminOrCustomerOwner,
  },
  fields: [
    {
      name: "job",
      type: "relationship",
      relationTo: "content-jobs",
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
      name: "rating",
      type: "number",
      required: true,
      min: 1,
      max: 5,
      index: true,
      admin: {
        position: "sidebar",
        description: "1-5 stars. 1 = unusable, 5 = ship-as-is.",
      },
    },
    {
      name: "notes",
      type: "textarea",
      admin: {
        description:
          "Optional free-form feedback the founder reads when synthesizing prompt-tuning iterations.",
      },
    },
  ],
};
