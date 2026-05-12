/**
 * Token refresh: finds accounts whose long-lived IG token is within the
 * refresh window (default 14 days) and extends them via the
 * `ig_refresh_token` grant. Designed to be called from a scheduler —
 * the schedule itself (cron) is out of scope for MVP-1 (see Issue #12 notes).
 *
 * Idempotent: each call only touches rows that need rotation, and persists
 * the new long-lived token + expiry in one update.
 */

import { getPayload, type Payload } from "payload";

import config from "@payload-config";

import { decryptToken } from "@/lib/crypto/tokens";
import { refreshLongLivedToken } from "@/lib/instagram/oauth";
import type { Account } from "@/payload-types";

export type RefreshSummary = {
  scanned: number;
  refreshed: number;
  failed: number;
  errors: { accountId: number; message: string }[];
};

export type RefreshOptions = {
  /** Refresh when expiry is within this many days. Default 14. */
  windowDays?: number;
  /** Cap on rows touched per run — defense in depth against runaway loops. */
  limit?: number;
};

export async function refreshExpiringInstagramTokens(
  options: RefreshOptions = {},
): Promise<RefreshSummary> {
  const windowDays = options.windowDays ?? 14;
  const limit = options.limit ?? 100;
  const payload = await getPayload({ config });
  const threshold = new Date(
    Date.now() + windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { docs } = await payload.find({
    collection: "accounts",
    overrideAccess: true,
    where: {
      platform: { equals: "instagram" },
      or: [
        { tokenExpiresAt: { less_than: threshold } },
        { tokenExpiresAt: { exists: false } },
      ],
    },
    limit,
    depth: 0,
  });

  const summary: RefreshSummary = {
    scanned: docs.length,
    refreshed: 0,
    failed: 0,
    errors: [],
  };

  for (const acct of docs as Account[]) {
    try {
      await rotateOne(payload, acct);
      summary.refreshed++;
    } catch (e) {
      summary.failed++;
      summary.errors.push({
        accountId: acct.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return summary;
}

async function rotateOne(payload: Payload, acct: Account): Promise<void> {
  const cleartext = decryptToken(acct.accessToken);
  const refreshed = await refreshLongLivedToken(cleartext);
  const tokenExpiresAt = new Date(
    Date.now() + refreshed.expires_in * 1000,
  ).toISOString();
  await payload.update({
    collection: "accounts",
    id: acct.id,
    data: {
      accessToken: refreshed.access_token,
      tokenExpiresAt,
    },
    overrideAccess: true,
  });
}
