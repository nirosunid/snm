import type { CollectionConfig } from "payload";

import {
  adminOnly,
  adminOnlyFieldAccess,
  adminOrSelf,
  isAdmin,
  publicAccess,
} from "@/access";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "role", "createdAt"],
  },
  access: {
    // Anyone can sign up. The `role` field's create access blocks privilege
    // escalation, so a malicious payload with role=admin falls through to the
    // field's default ('customer').
    create: publicAccess,
    // Customers see only themselves; admin/system see all.
    read: adminOrSelf,
    update: adminOrSelf,
    // Only staff can delete users.
    delete: adminOnly,
    // Hide the collection in the admin UI for non-staff.
    admin: isAdmin,
  },
  fields: [
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "customer",
      options: [
        { label: "Customer", value: "customer" },
        { label: "Admin", value: "admin" },
        { label: "System", value: "system" },
      ],
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        position: "sidebar",
        description:
          "Customer = end user. Admin = ops staff. System = platform-level. Only admin/system can change this.",
      },
    },
  ],
};
