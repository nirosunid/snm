/**
 * Brand brief shaping for the agent pipeline.
 *
 * Issue #2 used a hardcoded brand. Issue #4 reads from the `brands` Payload
 * collection — `brandBriefText` accepts a `BrandLike` (a structural subset of
 * `Brand` from payload-types) so callers can pass either a real brand record
 * or the hardcoded fallback unchanged.
 */

import type { Brand } from "@/payload-types";

export type BrandPalette = {
  primary?: string | null;
  secondary?: string | null;
  accent?: string | null;
  background?: string | null;
  text?: string | null;
};

export type BrandLike = {
  name: string;
  niche?: string | null;
  audience?: string | null;
  tone?: string | null;
  dos?: string[];
  donts?: string[];
  vocabulary?: string[];
  palette: BrandPalette;
};

export const HARDCODED_BRAND: BrandLike = {
  name: "Mercedes-Benz",
  niche: "luxury automotive — engineering, design, and driving experience",
  audience:
    "35-55 year-old professionals who value craftsmanship, performance, and understated status",
  tone: "refined, confident, understated; quality and detail over hype",
  dos: [
    "lead with a specific design or engineering detail",
    "use evocative, sensory language about driving and craftsmanship",
    "name concrete features or specs when they make the point sharper",
  ],
  donts: [
    "no tired luxury clichés ('ultimate driving experience', 'unparalleled')",
    "no direct comparisons or jabs at named competitors",
    "no superlatives that aren't grounded in a specific feature",
  ],
  palette: {
    primary: "#0F1419",
    secondary: "#7A8A9A",
    accent: "#7A8A9A",
    background: "#F4F4F4",
    text: "#0F1419",
  },
};

/** Coerce a Payload Brand record into the shape `brandBriefText` expects. */
export function brandLikeFromRecord(brand: Brand): BrandLike {
  return {
    name: brand.name,
    niche: brand.niche,
    audience: brand.audience,
    tone: brand.tone,
    dos: (brand.dos ?? []).map((d) => d.item).filter(Boolean),
    donts: (brand.donts ?? []).map((d) => d.item).filter(Boolean),
    vocabulary: (brand.vocabulary ?? []).map((v) => v.item).filter(Boolean),
    palette: brand.palette ?? {},
  };
}

export function brandBriefText(brand: BrandLike): string {
  const lines: string[] = [`Brand: ${brand.name}`];
  if (brand.niche) lines.push(`Niche: ${brand.niche}`);
  if (brand.audience) lines.push(`Audience: ${brand.audience}`);
  if (brand.tone) lines.push(`Tone: ${brand.tone}`);
  if (brand.dos && brand.dos.length > 0) {
    lines.push("Do:");
    brand.dos.forEach((d) => lines.push(`  - ${d}`));
  }
  if (brand.donts && brand.donts.length > 0) {
    lines.push("Don't:");
    brand.donts.forEach((d) => lines.push(`  - ${d}`));
  }
  if (brand.vocabulary && brand.vocabulary.length > 0) {
    lines.push(`Vocabulary: ${brand.vocabulary.join(", ")}`);
  }
  lines.push("");
  return lines.join("\n");
}
