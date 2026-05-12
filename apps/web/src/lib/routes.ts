/**
 * Central route registry.
 *
 * Every URL the app constructs goes through here — `Link href={…}`,
 * `redirect(…)`, `fetch(…)`, middleware matchers, server-action redirects.
 * Routes are functions so parameters and query strings are typed and
 * URL-encoding is centralized; static URLs are also exposed as functions
 * for symmetry. If you need to rename a path, this is the only file you
 * touch.
 *
 * Don't hand-build a URL string in a page or component — import this and
 * call the matching builder.
 */

const CUSTOMER_PREFIX = "/customer";
const API_CUSTOMER_PREFIX = "/api/customer";

type Query = Record<string, string | number | undefined | null>;

function withQuery(path: string, params?: Query): string {
  if (!params) return path;
  const search = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return search ? `${path}?${search}` : path;
}

export const routes = {
  // Public / marketing
  home: (): string => "/",
  privacy: (): string => "/privacy",
  terms: (): string => "/terms",

  // Auth (pre-auth, public)
  signUp: (params?: { next?: string }): string =>
    withQuery("/sign-up", { next: params?.next }),
  signIn: (params?: { next?: string }): string =>
    withQuery("/sign-in", { next: params?.next }),

  // Customer surface (auth-gated, /customer prefix)
  customer: {
    dashboard: (): string => `${CUSTOMER_PREFIX}/dashboard`,
    generate: (): string => `${CUSTOMER_PREFIX}/generate`,
    brands: {
      list: (): string => `${CUSTOMER_PREFIX}/brands`,
      new: (): string => `${CUSTOMER_PREFIX}/brands/new`,
      detail: (brandId: number | string): string =>
        `${CUSTOMER_PREFIX}/brands/${encodeURIComponent(String(brandId))}`,
      library: (brandId: number | string): string =>
        `${CUSTOMER_PREFIX}/brands/${encodeURIComponent(String(brandId))}/library`,
      queue: (brandId: number | string): string =>
        `${CUSTOMER_PREFIX}/brands/${encodeURIComponent(String(brandId))}/queue`,
      queueJob: (brandId: number | string, jobId: number | string): string =>
        `${CUSTOMER_PREFIX}/brands/${encodeURIComponent(String(brandId))}/queue/${encodeURIComponent(String(jobId))}`,
    },
    /** Predicate: is this path under the customer surface? */
    matches: (path: string): boolean =>
      path === CUSTOMER_PREFIX || path.startsWith(`${CUSTOMER_PREFIX}/`),
  },

  // Customer-callable APIs (/api/customer prefix)
  api: {
    customer: {
      generate: (): string => `${API_CUSTOMER_PREFIX}/generate`,
      render: (params: {
        type?: string;
        templateKey?: string;
        copy?: string;
        imageUrl?: string;
        caption?: string;
        attribution?: string;
        brandId?: number | string;
      }): string => withQuery(`${API_CUSTOMER_PREFIX}/render`, params),
      voiceSamples: (): string => `${API_CUSTOMER_PREFIX}/voice-samples`,
    },
    oauth: {
      instagram: {
        start: (brandId: number | string): string =>
          withQuery("/api/oauth/instagram/start", { brandId }),
        // Path-only — the URL Meta posts back to. Must match
        // INSTAGRAM_REDIRECT_URI in the .env.
        callback: (): string => "/api/oauth/instagram/callback",
      },
    },
  },

  // Dev-only surface (staff-gated)
  dev: {
    templates: (): string => "/dev/templates",
  },

  // Payload-owned (don't change — referenced for grep + a future rename guard)
  admin: (): string => "/admin",
} as const;
