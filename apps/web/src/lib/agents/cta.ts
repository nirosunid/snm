/**
 * Platform-correct call-to-action idioms for Instagram promo posts.
 *
 * Instagram blocks raw URLs in slide overlays and de-prioritizes them in
 * captions, so brands use idiomatic phrases that route attention to the
 * profile link or DMs instead. The same list is consumed by:
 *
 *   - the planner / writer prompts (so the LLM picks from a known set)
 *   - the reviewer (to validate that a recognized idiom is present)
 *   - the URL stripper (to remove raw URLs that slip into copy / caption)
 */

export const RECOGNIZED_CTA_IDIOMS = [
  "link in bio",
  "link in our bio",
  "link in profile",
  "tap the link in bio",
  "tap the link in our bio",
  "comment for the link",
  "comment {WORD} for the link",
  "comment below for details",
  "dm us",
  "dm us for the link",
  "send us a dm",
  "check our stories",
  "check our highlights",
  "save this post",
  "share with a friend",
] as const;

export type RecognizedCtaIdiom = (typeof RECOGNIZED_CTA_IDIOMS)[number];

/** Loose match: returns the first idiom whose normalized form appears in
 *  the input. The `{WORD}` placeholder is treated as a single-word wildcard. */
export function findCtaIdiom(text: string): RecognizedCtaIdiom | null {
  const haystack = text.toLowerCase();
  for (const idiom of RECOGNIZED_CTA_IDIOMS) {
    if (idiom.includes("{WORD}")) {
      // "comment {WORD} for the link" → /comment\s+\S+\s+for the link/
      const pattern = idiom
        .toLowerCase()
        .replace(/\{word\}/g, "[\\w-]+")
        .replace(/\s+/g, "\\s+");
      if (new RegExp(pattern).test(haystack)) return idiom;
    } else if (haystack.includes(idiom.toLowerCase())) {
      return idiom;
    }
  }
  return null;
}

/**
 * Strip raw URLs from caption / slide copy. Instagram doesn't make URLs
 * clickable in either surface and brand voice should refer to the idiom
 * instead. Tolerates `http://`, `https://`, `www.`, and bare `example.com`
 * style references when they look like a domain.
 */
const URL_PATTERN = new RegExp(
  // protocol form
  "https?://\\S+" +
    // www form
    "|www\\.\\S+" +
    // bare-domain form (e.g. example.com/path) — TLD must be 2+ chars
    "|\\b[a-z0-9-]+\\.[a-z]{2,}(?:/\\S*)?\\b",
  "gi",
);

export function stripUrls(text: string): string {
  return text.replace(URL_PATTERN, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Same as `stripUrls` but for a DraftPayload-like structure — returns a
 * shallow copy with `caption` and every slide's `copy` cleaned, and
 * reports which fields it touched so the pipeline can log it.
 */
export function stripUrlsFromDraft<
  T extends { caption: string; slides: { copy: string }[] },
>(draft: T): { draft: T; stripped: number } {
  let stripped = 0;
  const cleanedCaption = stripUrls(draft.caption);
  if (cleanedCaption !== draft.caption) stripped++;
  const slides = draft.slides.map((s) => {
    const cleaned = stripUrls(s.copy);
    if (cleaned !== s.copy) stripped++;
    return { ...s, copy: cleaned };
  });
  return { draft: { ...draft, caption: cleanedCaption, slides }, stripped };
}
