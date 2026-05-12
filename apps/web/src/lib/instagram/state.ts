/**
 * OAuth state token: opaque blob round-tripped between our start route and
 * Meta's callback. Carries the brandId so the callback knows which brand
 * to attach the new account to, plus a nonce + timestamp signed with
 * PAYLOAD_SECRET so a forged callback can't impersonate a user mid-flow.
 *
 * Wire format: `<base64url(JSON)>.<hmac_b64url>` — the same blob also lives
 * in an httpOnly cookie set by the start route; the callback rejects any
 * state whose body+sig doesn't match the cookie.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000; // 10 minutes

type Body = {
  brandId: number;
  nonce: string;
  ts: number;
};

function secret(): Buffer {
  const v = process.env.PAYLOAD_SECRET;
  if (!v || v.length < 32) {
    throw new Error(
      "PAYLOAD_SECRET must be set and at least 32 chars long for OAuth state signing.",
    );
  }
  return Buffer.from(v, "utf8");
}

function toB64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(bodyB64: string): string {
  return toB64url(createHmac("sha256", secret()).update(bodyB64).digest());
}

export function createState(brandId: number): string {
  const body: Body = {
    brandId,
    nonce: toB64url(randomBytes(16)),
    ts: Date.now(),
  };
  const bodyB64 = toB64url(Buffer.from(JSON.stringify(body), "utf8"));
  const sig = sign(bodyB64);
  return `${bodyB64}.${sig}`;
}

export type ParsedState =
  | { ok: true; brandId: number }
  | { ok: false; error: string };

export function verifyState(value: string, expected: string): ParsedState {
  if (value !== expected) {
    return { ok: false, error: "OAuth state mismatch (cookie ≠ callback)." };
  }
  const parts = value.split(".");
  if (parts.length !== 2) {
    return { ok: false, error: "Malformed OAuth state." };
  }
  const [bodyB64, sig] = parts;
  const expectedSig = sign(bodyB64);
  const a = fromB64url(sig);
  const b = fromB64url(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "OAuth state signature invalid." };
  }
  let body: Body;
  try {
    body = JSON.parse(fromB64url(bodyB64).toString("utf8")) as Body;
  } catch {
    return { ok: false, error: "OAuth state body could not be decoded." };
  }
  if (!Number.isInteger(body.brandId) || body.brandId <= 0) {
    return { ok: false, error: "OAuth state references no brand." };
  }
  if (Date.now() - body.ts > TTL_MS) {
    return { ok: false, error: "OAuth state has expired — start over." };
  }
  return { ok: true, brandId: body.brandId };
}

export const OAUTH_STATE_COOKIE = "smn_ig_oauth_state";
