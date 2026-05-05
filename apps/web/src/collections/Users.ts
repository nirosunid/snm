import type { CollectionConfig } from "payload";

// Minimal Users collection — extended in Issue #3 with role enum (system/admin/customer)
// and per-collection access functions.
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  fields: [
    // email + password are added by `auth: true`
  ],
};
