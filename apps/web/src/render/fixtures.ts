/**
 * Brand fixtures used by `/dev/templates` for visual QA. The render route
 * recognizes `brandId=fixture:<key>` and substitutes one of these palettes
 * instead of fetching from the brands collection — no DB row required, and
 * no auth either (the render endpoint stays anonymously callable for these
 * dev-only ids).
 */

import type { RenderBrand } from "./templates";

export const FIXTURE_BRANDS: Record<string, RenderBrand> = {
  luxury: {
    name: "Mercedes-Benz",
    font: "Playfair Display",
    palette: {
      primary: "#0F1419",
      secondary: "#7A8A9A",
      accent: "#7A8A9A",
      background: "#F4F4F4",
      text: "#0F1419",
    },
    logoUrl: null,
  },
  fitness: {
    name: "FitDesk",
    font: "Inter",
    palette: {
      primary: "#0B1F12",
      secondary: "#3F8C5A",
      accent: "#22C55E",
      background: "#ECFDF3",
      text: "#0B1F12",
    },
    logoUrl: null,
  },
  bakery: {
    name: "Loaf & Linen",
    font: "IBM Plex Sans",
    palette: {
      primary: "#3B2415",
      secondary: "#A0784E",
      accent: "#E07B3F",
      background: "#FFF6E8",
      text: "#3B2415",
    },
    logoUrl: null,
  },
};

export type FixtureKey = keyof typeof FIXTURE_BRANDS;
export const FIXTURE_KEYS: FixtureKey[] = Object.keys(FIXTURE_BRANDS) as FixtureKey[];

const FIXTURE_PREFIX = "fixture:";

export function parseFixtureBrandId(raw: string | undefined | null): RenderBrand | undefined {
  if (!raw || !raw.startsWith(FIXTURE_PREFIX)) return undefined;
  const key = raw.slice(FIXTURE_PREFIX.length);
  return FIXTURE_BRANDS[key];
}

export function fixtureBrandId(key: FixtureKey): string {
  return `${FIXTURE_PREFIX}${key}`;
}
