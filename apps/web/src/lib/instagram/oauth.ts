/**
 * Instagram Login API helpers.
 *
 * Uses Meta's *Instagram Login* (not Facebook Login) so a customer can
 * connect a Business/Creator IG account directly — no Facebook Page link
 * required. Endpoints per the public Graph API docs:
 *
 *   - Authorize       https://www.instagram.com/oauth/authorize
 *   - Token exchange  https://api.instagram.com/oauth/access_token
 *   - Long-lived      https://graph.instagram.com/access_token
 *   - Refresh         https://graph.instagram.com/refresh_access_token
 *   - Profile         https://graph.instagram.com/v21.0/me
 *
 * `INSTAGRAM_OAUTH_MOCK=1` short-circuits the real Meta calls and emits
 * deterministic synthetic responses so we can smoke-test the full UI flow
 * without Meta App credentials. Controlled via:
 *   - INSTAGRAM_OAUTH_MOCK_ACCOUNT_TYPE   BUSINESS | MEDIA_CREATOR | PERSONAL
 *   - INSTAGRAM_OAUTH_MOCK_USERNAME       default 'mock_handle'
 *   - INSTAGRAM_OAUTH_MOCK_USER_ID        default '17841400000000000'
 */

const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const LONG_LIVED_URL = "https://graph.instagram.com/access_token";
const REFRESH_URL = "https://graph.instagram.com/refresh_access_token";
const PROFILE_URL = "https://graph.instagram.com/v21.0/me";

/** Scopes we need for MVP-1: read the IG user profile + publish carousels. */
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
];

export const RAW_ACCOUNT_TYPES = ["BUSINESS", "MEDIA_CREATOR", "PERSONAL"] as const;
export type RawAccountType = (typeof RAW_ACCOUNT_TYPES)[number];

export type ShortLivedTokenResponse = {
  access_token: string;
  user_id: string;
};

export type LongLivedTokenResponse = {
  access_token: string;
  token_type: "bearer";
  /** Seconds until expiry (IG long-lived is ~5,184,000 ≈ 60 days). */
  expires_in: number;
};

export type ProfileResponse = {
  id: string;
  username: string;
  account_type: RawAccountType;
};

export function isMockMode(): boolean {
  return process.env.INSTAGRAM_OAUTH_MOCK === "1";
}

function appId(): string {
  const v = process.env.META_APP_ID;
  if (!v) throw new Error("META_APP_ID is not set.");
  return v;
}

function appSecret(): string {
  const v = process.env.META_APP_SECRET;
  if (!v) throw new Error("META_APP_SECRET is not set.");
  return v;
}

function redirectUri(): string {
  const v = process.env.INSTAGRAM_REDIRECT_URI;
  if (!v) throw new Error("INSTAGRAM_REDIRECT_URI is not set.");
  return v;
}

/** Build the URL we redirect the customer to when they click Connect. */
export function buildAuthorizeUrl(state: string): string {
  if (isMockMode()) {
    // Mock mode bypasses Meta entirely — the start route handles redirection
    // straight to the callback. This branch exists so a caller printing the
    // URL during debugging gets something obviously synthetic.
    return `mock://instagram-authorize?state=${encodeURIComponent(state)}`;
  }
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", appId());
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("scope", SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
): Promise<ShortLivedTokenResponse> {
  if (isMockMode()) {
    return {
      access_token: `mock-short-${code.slice(0, 8)}`,
      user_id: process.env.INSTAGRAM_OAUTH_MOCK_USER_ID ?? "17841400000000000",
    };
  }
  const body = new URLSearchParams({
    client_id: appId(),
    client_secret: appSecret(),
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) {
    throw new Error(
      `Instagram code-for-token exchange failed (HTTP ${res.status}): ${await safeText(res)}`,
    );
  }
  return (await res.json()) as ShortLivedTokenResponse;
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<LongLivedTokenResponse> {
  if (isMockMode()) {
    return {
      access_token: `mock-long-${shortLivedToken.slice(-8)}`,
      token_type: "bearer",
      expires_in: 60 * 24 * 60 * 60, // 60 days in seconds
    };
  }
  const url = new URL(LONG_LIVED_URL);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret());
  url.searchParams.set("access_token", shortLivedToken);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(
      `Instagram long-lived exchange failed (HTTP ${res.status}): ${await safeText(res)}`,
    );
  }
  return (await res.json()) as LongLivedTokenResponse;
}

export async function refreshLongLivedToken(
  longLivedToken: string,
): Promise<LongLivedTokenResponse> {
  if (isMockMode()) {
    return {
      access_token: `mock-long-refreshed-${longLivedToken.slice(-8)}`,
      token_type: "bearer",
      expires_in: 60 * 24 * 60 * 60,
    };
  }
  const url = new URL(REFRESH_URL);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", longLivedToken);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(
      `Instagram refresh failed (HTTP ${res.status}): ${await safeText(res)}`,
    );
  }
  return (await res.json()) as LongLivedTokenResponse;
}

export async function fetchProfile(
  longLivedToken: string,
): Promise<ProfileResponse> {
  if (isMockMode()) {
    const rawType = (
      process.env.INSTAGRAM_OAUTH_MOCK_ACCOUNT_TYPE ?? "BUSINESS"
    ).toUpperCase();
    const accountType = (RAW_ACCOUNT_TYPES as readonly string[]).includes(rawType)
      ? (rawType as RawAccountType)
      : "BUSINESS";
    return {
      id: process.env.INSTAGRAM_OAUTH_MOCK_USER_ID ?? "17841400000000000",
      username: process.env.INSTAGRAM_OAUTH_MOCK_USERNAME ?? "mock_handle",
      account_type: accountType,
    };
  }
  const url = new URL(PROFILE_URL);
  url.searchParams.set("fields", "id,username,account_type");
  url.searchParams.set("access_token", longLivedToken);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(
      `Instagram profile fetch failed (HTTP ${res.status}): ${await safeText(res)}`,
    );
  }
  return (await res.json()) as ProfileResponse;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
