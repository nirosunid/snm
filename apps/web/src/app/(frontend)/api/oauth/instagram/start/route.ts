import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@payload-config";

import { currentUser } from "@/lib/auth/session";
import { buildAuthorizeUrl, isMockMode } from "@/lib/instagram/oauth";
import { createState, OAUTH_STATE_COOKIE } from "@/lib/instagram/state";
import { routes } from "@/lib/routes";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(routes.signIn({ next: req.url }), req.url),
    );
  }

  const url = new URL(req.url);
  const brandIdRaw = url.searchParams.get("brandId");
  const brandId = brandIdRaw ? Number(brandIdRaw) : NaN;
  if (!Number.isInteger(brandId) || brandId <= 0) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }

  // Ownership check: refuse to start an OAuth round-trip for a brand the
  // caller doesn't own. Without this, an attacker who guessed a brandId
  // could attach a freshly-OAuthed account to it.
  const payload = await getPayload({ config });
  try {
    await payload.findByID({
      collection: "brands",
      id: brandId,
      user,
      overrideAccess: false,
      depth: 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Brand not found or not owned by you." },
      { status: 404 },
    );
  }

  const state = createState(brandId);
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  if (isMockMode()) {
    // Skip Meta entirely: bounce straight to our callback with a synthetic
    // code. The state we just set in the cookie is what the callback will
    // also receive in the query string, so verification still runs.
    const callbackUrl = new URL("/api/oauth/instagram/callback", req.url);
    callbackUrl.searchParams.set("code", "mock-auth-code");
    callbackUrl.searchParams.set("state", state);
    return NextResponse.redirect(callbackUrl);
  }

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
