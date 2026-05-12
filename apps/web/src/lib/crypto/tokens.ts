/**
 * Symmetric encryption for OAuth tokens at rest.
 *
 * AES-256-GCM. Key is derived from TOKEN_ENCRYPTION_KEY via SHA-256, so
 * the env var can be any string ≥ 32 chars (we hash it to a 32-byte key).
 *
 * Wire format: `gcm:v1:<iv_b64url>:<tag_b64url>:<ciphertext_b64url>`.
 * The `gcm:v1:` prefix lets us migrate to a different scheme later without
 * having to guess what an existing row was encrypted with.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "gcm:v1:";
const IV_LENGTH = 12; // 96-bit nonce — recommended for GCM
const TAG_LENGTH = 16;

function key(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be set and at least 32 chars long. Generate with: openssl rand -hex 32",
    );
  }
  return createHash("sha256").update(secret).digest();
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

/** True if `value` already looks encrypted (i.e. carries our prefix). */
export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptToken(plaintext: string): string {
  if (isEncrypted(plaintext)) return plaintext; // idempotent
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${toB64url(iv)}:${toB64url(tag)}:${toB64url(ct)}`;
}

export function decryptToken(value: string): string {
  if (!isEncrypted(value)) {
    // Tolerate cleartext only during development handoffs — callers should
    // never persist cleartext into the DB. If we see one here, log and
    // return as-is so reads don't hard-fail.
    return value;
  }
  const body = value.slice(PREFIX.length);
  const parts = body.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token (expected 3 parts).");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = fromB64url(ivB64);
  const tag = fromB64url(tagB64);
  if (tag.length !== TAG_LENGTH) {
    throw new Error("Malformed encrypted token (bad tag length).");
  }
  const ct = fromB64url(ctB64);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
