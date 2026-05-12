import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@payload-config";

import { currentUser } from "@/lib/auth/session";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchProfile,
  type RawAccountType,
} from "@/lib/instagram/oauth";
import { OAUTH_STATE_COOKIE, verifyState } from "@/lib/instagram/state";
import { routes } from "@/lib/routes";
import type { Account } from "@/payload-types";

export const runtime = "nodejs";

type ConnectStatus = "connected" | "personal_account_refused" | "error";

function redirectBack(
  base: URL,
  brandId: number | null,
  status: ConnectStatus,
  message?: string,
): NextResponse {
  // No brandId? Fall back to the brands list rather than a 500.
  const path = brandId
    ? routes.customer.brands.detail(brandId)
    : routes.customer.brands.list();
  const url = new URL(path, base);
  url.searchParams.set("ig", status);
  if (message) url.searchParams.set("ig_message", message);
  return NextResponse.redirect(url);
}

function mapAccountType(
  raw: RawAccountType,
): "business" | "media_creator" | null {
  if (raw === "BUSINESS") return "business";
  if (raw === "MEDIA_CREATOR") return "media_creator";
  return null;
}

export async function GET(req: Request) {
  const base = new URL(req.url);
  const igError = base.searchParams.get("error");
  const code = base.searchParams.get("code");
  const stateParam = base.searchParams.get("state");

  // Always clear the state cookie — used or not, it's single-use.
  const jar = await cookies();
  const cookieState = jar.get(OAUTH_STATE_COOKIE)?.value ?? null;
  jar.delete(OAUTH_STATE_COOKIE);

  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(routes.signIn({ next: req.url }), req.url),
    );
  }

  if (igError) {
    return redirectBack(
      base,
      null,
      "error",
      `Instagram returned an error: ${igError}`,
    );
  }
  if (!code || !stateParam || !cookieState) {
    return redirectBack(
      base,
      null,
      "error",
      "Missing OAuth code/state. Start the flow from the brand page.",
    );
  }

  const verified = verifyState(stateParam, cookieState);
  if (!verified.ok) {
    return redirectBack(base, null, "error", verified.error);
  }
  const brandId = verified.brandId;

  // Reconfirm brand ownership at callback time (state is signed but the
  // user could have lost the brand between start and callback).
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
    return redirectBack(
      base,
      null,
      "error",
      "Brand not found or not owned by you.",
    );
  }

  let profile: { id: string; username: string; account_type: RawAccountType };
  let longLived: { access_token: string; expires_in: number };
  try {
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLivedToken(short.access_token);
    longLived = long;
    profile = await fetchProfile(long.access_token);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return redirectBack(base, brandId, "error", message);
  }

  const mapped = mapAccountType(profile.account_type);
  if (!mapped) {
    return redirectBack(
      base,
      brandId,
      "personal_account_refused",
      `Instagram returned account_type=${profile.account_type}. Convert to a Business or Creator account, then reconnect.`,
    );
  }

  // Dedup: one row per (brand, platform=instagram, platformUserId). If the
  // customer reconnects the same IG account, we update the existing row
  // with the new token rather than creating a duplicate.
  const existing = await payload.find({
    collection: "accounts",
    user,
    overrideAccess: false,
    where: {
      brand: { equals: brandId },
      platform: { equals: "instagram" },
      platformUserId: { equals: profile.id },
    },
    limit: 1,
    depth: 0,
  });

  const tokenExpiresAt = new Date(
    Date.now() + longLived.expires_in * 1000,
  ).toISOString();

  if (existing.docs.length > 0) {
    await payload.update({
      collection: "accounts",
      id: (existing.docs[0] as Account).id,
      data: {
        username: profile.username,
        accountType: mapped,
        accessToken: longLived.access_token,
        tokenExpiresAt,
      },
      user,
      overrideAccess: false,
    });
  } else {
    await payload.create({
      collection: "accounts",
      data: {
        brand: brandId,
        owner: user.id,
        platform: "instagram",
        platformUserId: profile.id,
        username: profile.username,
        accountType: mapped,
        accessToken: longLived.access_token,
        tokenExpiresAt,
        connectedAt: new Date().toISOString(),
      },
      user,
      overrideAccess: false,
    });
  }

  return redirectBack(base, brandId, "connected");
}
