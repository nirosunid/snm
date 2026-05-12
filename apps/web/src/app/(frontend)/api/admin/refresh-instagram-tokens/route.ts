/**
 * Admin-only endpoint that scans for Instagram tokens within the refresh
 * window and rotates them. Designed to be called from any external scheduler
 * (system cron, Docker sidecar, or — eventually — a Payload jobs queue).
 *
 * The actual scheduling is out of scope for MVP-1 (see Issue #12 deferral
 * notes). For local testing:
 *   curl -X POST http://localhost:3000/api/admin/refresh-instagram-tokens \
 *     -b "<your admin auth cookie>"
 */

import { NextResponse } from "next/server";

import { isStaff } from "@/access";
import { currentUser } from "@/lib/auth/session";
import { refreshExpiringInstagramTokens } from "@/lib/instagram/refresh";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !isStaff(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(req.url);
  const windowDays = numParam(url, "windowDays");
  const limit = numParam(url, "limit");

  try {
    const summary = await refreshExpiringInstagramTokens({
      windowDays,
      limit,
    });
    return NextResponse.json(summary);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function numParam(url: URL, key: string): number | undefined {
  const raw = url.searchParams.get(key);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
