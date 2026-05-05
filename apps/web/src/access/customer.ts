import type { Access, FieldAccess } from "payload";

import { checkAdminRole } from "./admin";
import { checkRole } from "./utilities";

type AccessUser = Parameters<typeof checkRole>[1];

export const checkCustomerRole = (user: AccessUser) => checkRole(["customer"], user);

/** Collection-level: customer role only. */
export const customerOnly: Access = ({ req: { user } }) =>
  checkCustomerRole(user as AccessUser);

/** Field-level: customer role only. */
export const customerOnlyFieldAccess: FieldAccess = ({ req: { user } }) =>
  checkCustomerRole(user as AccessUser);

/**
 * Collection-level: customers see only documents whose `owner` field equals
 * their user id. Used by ownership-scoped collections (Brands, Accounts,
 * VoiceSamples, Assets, ContentJobs, ...). The relation field is conventionally
 * named `owner`; collections that use a different name should compose their
 * own access function.
 */
export const customerOwner: Access = ({ req: { user } }) => {
  const u = user as AccessUser;
  if (u?.id) return { owner: { equals: u.id } };
  return false;
};

/**
 * Collection-level: system/admin has full access; customers see only their
 * own owned rows (via `owner` field).
 */
export const adminOrCustomerOwner: Access = ({ req: { user } }) => {
  const u = user as AccessUser;
  if (!u) return false;
  if (checkAdminRole(u)) return true;
  if (u.id) return { owner: { equals: u.id } };
  return false;
};
