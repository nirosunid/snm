/**
 * User-initiated data deletion endpoint. The in-app "Delete my account"
 * button is the primary surface, but exposing this as an API endpoint
 * gives operators a programmatic path for fulfilling GDPR / CCPA
 * deletion requests submitted via support email.
 *
 * Auth: bearer token via the Payload auth cookie (same as the app).
 * Body:  { confirmEmail: string } — must equal the caller's email.
 *
 * For Meta App Review's *Data Deletion Callback* (a separate, signed
 * request from Meta when a user removes the FB app), see
 * docs/ops/launch-prerequisites.md — that endpoint is added when App
 * Review demands it.
 */

import { NextResponse } from "next/server";

import { deleteMyAccount } from "@/lib/account/actions";
import { currentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const confirmEmail =
    typeof (body as { confirmEmail?: unknown })?.confirmEmail === "string"
      ? (body as { confirmEmail: string }).confirmEmail
      : "";

  const result = await deleteMyAccount({ confirmEmail });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    deleted: result.summary,
    message:
      "All your data has been deleted from SMN. Some records may persist in third-party processors (Stripe invoices, Meta-side post records) per their own retention policies.",
  });
}
