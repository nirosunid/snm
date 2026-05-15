/**
 * Meta-signed Data Deletion Callback.
 *
 * Meta calls this when a user removes the SMN app from their Facebook
 * account. Spec: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 *   - Body field `signed_request` (URL-encoded form post).
 *   - Verify with META_APP_SECRET.
 *   - Decode JSON, read `user_id` (the IG-user id, not our SMN user id).
 *   - Delete every `accounts` row keyed by platformUserId. Do NOT delete
 *     the SMN user — they may have other connected accounts.
 *   - Respond { url, confirmation_code } so Meta can show the user a
 *     status page.
 *
 * The user-initiated deletion path (in-app) lives at /api/data-deletion
 * with a different auth model.
 */

import { randomBytes } from "crypto";

import { NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@payload-config";

import { verifySignedRequest } from "@/lib/instagram/signed-request";
import { routes } from "@/lib/routes";
import type { Account } from "@/payload-types";

export const runtime = "nodejs";

function origin(): string {
  return (
    process.env.NEXT_PUBLIC_SERVER_URL ??
    process.env.PAYLOAD_PUBLIC_SERVER_URL ??
    "http://localhost:3000"
  );
}

export async function POST(req: Request) {
  // Meta sends application/x-www-form-urlencoded with a `signed_request` field.
  // We read body as text and parse manually so a JSON content-type doesn't
  // throw the parser off if Meta's spec ever changes.
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const signed = params.get("signed_request");
  if (!signed) {
    return NextResponse.json(
      { error: "Missing signed_request body field." },
      { status: 400 },
    );
  }

  const verified = verifySignedRequest(signed);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  const platformUserId = verified.payload.user_id;
  if (!platformUserId) {
    return NextResponse.json(
      { error: "signed_request payload has no user_id." },
      { status: 400 },
    );
  }

  // Confirmation code Meta will surface back to the user in their data
  // settings. Random per request — operator can grep logs to correlate
  // if a deletion-status page becomes a thing later.
  const confirmationCode = `del_${randomBytes(8).toString("hex")}`;

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "accounts",
    overrideAccess: true,
    where: {
      platform: { equals: "instagram" },
      platformUserId: { equals: platformUserId },
    },
    limit: 100,
    depth: 0,
  });

  for (const account of docs as Account[]) {
    try {
      await payload.delete({
        collection: "accounts",
        id: account.id,
        overrideAccess: true,
      });
    } catch (e) {
      // Log and keep going — a single delete failure shouldn't block the
      // others, and Meta retries the callback on a non-200.
      console.warn(
        `[meta data-deletion] failed to delete account ${account.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(
    `[meta data-deletion] platformUserId=${platformUserId} deleted=${docs.length} confirmation=${confirmationCode}`,
  );

  return NextResponse.json({
    // Status URL Meta surfaces to the user. We point at the privacy policy's
    // deletion section — operators can replace with a per-request page later.
    url: `${origin()}${routes.privacy()}#data-retention--deletion`,
    confirmation_code: confirmationCode,
  });
}
