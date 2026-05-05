import type { Access, FieldAccess } from "payload";

import { checkRole } from "./utilities";

export const checkSystemRole = (user: Parameters<typeof checkRole>[1]) =>
  checkRole(["system"], user);

/** Collection-level: system role only. */
export const systemOnly: Access = ({ req: { user } }) =>
  checkSystemRole(user as Parameters<typeof checkRole>[1]);

/** Field-level: system role only. */
export const systemOnlyFieldAccess: FieldAccess = ({ req: { user } }) =>
  checkSystemRole(user as Parameters<typeof checkRole>[1]);
