/**
 * Auth predicate for admin/ops endpoints that need to be callable from
 * an unattended scheduler (the ops-cron sidecar) AND from a logged-in
 * staff user.
 *
 * Scheduler path: shared secret in `X-Ops-Cron-Secret` header, compared
 * with `timingSafeEqual` against `OPS_CRON_SECRET`. The endpoint also
 * still accepts an authenticated staff cookie via `isStaff(user)` —
 * that's the human path.
 */

import { timingSafeEqual } from "crypto";

import { isStaff } from "@/access";
import { currentUser } from "@/lib/auth/session";

export type OpsAuthResult =
  | { ok: true; via: "cron" | "staff" }
  | { ok: false; status: 401 | 403; reason: string };

export async function authorizeOpsRequest(
  req: Request,
): Promise<OpsAuthResult> {
  const headerSecret = req.headers.get("x-ops-cron-secret");
  if (headerSecret) {
    const envSecret = process.env.OPS_CRON_SECRET;
    if (!envSecret) {
      return {
        ok: false,
        status: 401,
        reason: "OPS_CRON_SECRET is not configured server-side.",
      };
    }
    const a = Buffer.from(headerSecret);
    const b = Buffer.from(envSecret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, status: 403, reason: "Bad ops cron secret." };
    }
    return { ok: true, via: "cron" };
  }

  const user = await currentUser();
  if (!user) return { ok: false, status: 401, reason: "Not signed in." };
  if (!isStaff(user)) {
    return { ok: false, status: 403, reason: "Staff role required." };
  }
  return { ok: true, via: "staff" };
}
