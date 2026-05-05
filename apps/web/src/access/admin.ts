import type { Access, FieldAccess, PayloadRequest } from "payload";

import { checkRole } from "./utilities";

type AccessUser = Parameters<typeof checkRole>[1];

/** "Staff" = admin OR system. */
export const checkAdminRole = (user: AccessUser) => checkRole(["system", "admin"], user);

/** Readable alias for `checkAdminRole` for use in app code (e.g. "if (isStaff(user)) …"). */
export const isStaff = checkAdminRole;

/** Collection-level: system or admin role. */
export const adminOnly: Access = ({ req: { user } }) =>
  checkAdminRole(user as AccessUser);

/** Field-level: system or admin role. */
export const adminOnlyFieldAccess: FieldAccess = ({ req: { user } }) =>
  checkAdminRole(user as AccessUser);

/**
 * Boolean-only check for slots that don't accept a `Where` query, e.g.
 * `collection.access.admin` (admin-UI visibility) or `collection.admin.hidden`.
 * Same authorization rule as `adminOnly`, narrower return type.
 */
export const isAdmin = ({ req: { user } }: { req: PayloadRequest }): boolean =>
  checkAdminRole(user as AccessUser);

/**
 * Collection-level: system/admin has full access; everyone else is constrained
 * to their own user row. Useful on the `users` collection so customers can read
 * and update themselves but never another row.
 */
export const adminOrSelf: Access = ({ req: { user } }) => {
  const u = user as AccessUser;
  if (!u) return false;
  if (checkAdminRole(u)) return true;
  return { id: { equals: u.id! } };
};
