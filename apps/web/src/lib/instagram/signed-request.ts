/**
 * Verify a Meta `signed_request` payload — the format Meta uses for the
 * Data Deletion Callback (and a few other webhook-style endpoints).
 *
 * Wire format: `<base64url-signature>.<base64url-payload>` where
 *   - signature = HMAC-SHA256(payload, META_APP_SECRET)
 *   - payload = JSON
 *
 * Meta's docs: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow#parsingsr
 */

import { createHmac, timingSafeEqual } from "crypto";

export type SignedRequestPayload = {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
  // Other fields Meta may include — we only act on user_id today.
  [key: string]: unknown;
};

export type VerifyResult =
  | { ok: true; payload: SignedRequestPayload }
  | { ok: false; error: string };

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function verifySignedRequest(value: string): VerifyResult {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return { ok: false, error: "META_APP_SECRET is not set." };

  const parts = value.split(".");
  if (parts.length !== 2) {
    return { ok: false, error: "Malformed signed_request (expected sig.payload)." };
  }
  const [sigB64, payloadB64] = parts;

  const sig = fromB64url(sigB64);
  const expected = createHmac("sha256", secret).update(payloadB64).digest();

  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    return { ok: false, error: "Signature verification failed." };
  }

  let payload: SignedRequestPayload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8")) as SignedRequestPayload;
  } catch {
    return { ok: false, error: "Payload is not valid JSON." };
  }

  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
    return {
      ok: false,
      error: `Unexpected algorithm in signed_request: ${payload.algorithm}.`,
    };
  }

  return { ok: true, payload };
}
