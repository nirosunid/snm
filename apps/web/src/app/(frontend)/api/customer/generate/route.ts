import { NextResponse } from "next/server";

import { runPipeline } from "@/lib/agents/pipeline";
import { GenerateRequestSchema } from "@/lib/agents/schemas";
import { currentUser } from "@/lib/auth/session";
import { checkPaywall } from "@/lib/billing/paywall";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Paywall gate. Same check that the ContentJobs collection's
  // beforeValidate hook enforces — running it here too gives a clean 402
  // before we kick off the pipeline (vs. a 500 surfaced from a hook throw).
  const paywall = await checkPaywall(user);
  if (!paywall.ok) {
    const error =
      paywall.reason === "no_subscription"
        ? "An active Pro subscription is required to generate carousels."
        : `Your subscription is ${paywall.status}; renew or update payment to keep generating.`;
    return NextResponse.json(
      { error, reason: paywall.reason },
      { status: 402 },
    );
  }

  if (parsed.data.brandId === undefined) {
    return NextResponse.json(
      {
        error:
          "brandId is required. Generated drafts are persisted as content-jobs scoped to a brand — create one at /customer/brands/new first.",
      },
      { status: 400 },
    );
  }

  const brandId = Number(parsed.data.brandId);
  if (!Number.isInteger(brandId) || brandId <= 0) {
    return NextResponse.json({ error: "Invalid brandId." }, { status: 400 });
  }

  try {
    const response = await runPipeline({
      topic: parsed.data.topic,
      brandId,
      user,
      promo: parsed.data.promo,
    });
    // Pipeline always returns 200 with the response (status='failed' carries
    // the error inline). Surface 502 only for unexpected throws above.
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
