import type { Access, PayloadRequest } from "payload";

import type { User } from "@/payload-types";

export type Role = NonNullable<User["role"]>;

/**
 * Permissive shape used by the helpers below — Payload's access functions
 * receive `UntypedUser | null` rather than the project's `User`, and the
 * project `User`'s strict `sessions` typing is not assignable to it. This
 * shape is the minimal contract we actually rely on.
 */
type MaybeUser = { id?: number | string; role?: Role | null } | null | undefined;

/** Returns true if the user's role is one of the given roles. */
export const checkRole = (allRoles: Role[], user: MaybeUser): boolean =>
  !!user?.role && allRoles.includes(user.role);

/** Returns true if the user is signed in with any known role. */
export const userHaveAnyRole = (user: MaybeUser): boolean =>
  checkRole(["system", "admin", "customer"], user);

/** Wraps `userHaveAnyRole` for use inside Payload access functions. */
export const haveAnyRole = ({ req: { user } }: { req: PayloadRequest }): boolean =>
  userHaveAnyRole(user as MaybeUser);

/** Collection-level: any authenticated user with a valid role. */
export const isLoggedIn: Access = ({ req: { user } }) =>
  userHaveAnyRole(user as MaybeUser);
