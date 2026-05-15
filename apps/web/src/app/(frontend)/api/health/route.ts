/**
 * Public liveness + readiness probe.
 *
 * Returns 200 when the web service is up AND the database is reachable.
 * Used by:
 *   - Meta App Review reviewers checking the app responds.
 *   - Operators verifying a deploy succeeded (curl from CI / cron).
 *   - Future uptime monitoring.
 *
 * No auth — payload is intentionally minimal so it doesn't leak shape
 * information about the running app.
 */

import { NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@payload-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STARTED_AT = Date.now();

export async function GET() {
  const checks: Record<string, "ok" | "fail"> = {};

  // Database round-trip: a 1-doc find on a known collection is cheap and
  // exercises the connection pool + schema. We don't care what it returns.
  try {
    const payload = await getPayload({ config });
    await payload.find({
      collection: "users",
      overrideAccess: true,
      limit: 1,
      depth: 0,
    });
    checks.database = "ok";
  } catch {
    checks.database = "fail";
  }

  const ok = Object.values(checks).every((v) => v === "ok");
  return NextResponse.json(
    {
      ok,
      uptime_seconds: Math.floor((Date.now() - STARTED_AT) / 1000),
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
