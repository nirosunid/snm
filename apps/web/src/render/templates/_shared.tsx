import type { ReactElement } from "react";

import type { RenderBrand } from "./types";

export const SLIDE_SIZE = 1080;

/** Defaults applied when a brand or its palette field is missing. */
export const FALLBACK_BRAND: RenderBrand = {
  name: "Brand",
  font: "Inter",
  palette: {
    primary: "#0F1419",
    secondary: "#7A8A9A",
    accent: "#7A8A9A",
    background: "#F4F4F4",
    text: "#0F1419",
  },
  logoUrl: null,
};

/** Coerce a partial brand into a fully populated RenderBrand. */
export function withDefaults(brand: Partial<RenderBrand> | undefined): RenderBrand {
  return {
    name: brand?.name ?? FALLBACK_BRAND.name,
    font: brand?.font ?? FALLBACK_BRAND.font,
    palette: { ...FALLBACK_BRAND.palette, ...(brand?.palette ?? {}) },
    logoUrl: brand?.logoUrl ?? null,
  };
}

/**
 * Logo watermark for the slide. Renders nothing when the brand has no logo —
 * Instagram already shows the brand in the post header, so an in-slide text
 * label would just duplicate that and read as templated content.
 */
export function BrandFooter({
  brand,
}: {
  brand: RenderBrand;
}): ReactElement | null {
  if (!brand.logoUrl) return null;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brand.logoUrl}
        alt=""
        width={56}
        height={56}
        style={{ display: "block", opacity: 0.85 }}
      />
    </div>
  );
}
