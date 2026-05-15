import { headers as nextHeaders } from "next/headers";
import { getPayload } from "payload";

import config from "@payload-config";

import type { User } from "@/payload-types";

/**
 * Resolve the currently authenticated user from the Payload auth cookie,
 * or null if the request is unauthenticated.
 *
 * Use only in server components, route handlers, and server actions.
 */
export async function currentUser(): Promise<User | null> {
  const payload = await getPayload({ config });
  const headers = await nextHeaders();
  const result = await payload.auth({ headers });
  return (result.user as User | null) ?? null;
}

// Role predicates live in `@/access` — re-export the ones an auth-aware page
// or component is most likely to reach for, so callers don't have to know the
// difference between "auth state" (this file) and "authorization rules" (access/).
export { isStaff } from "@/access";
