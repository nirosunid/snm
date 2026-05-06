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

export function BrandFooter({
  brand,
  kicker,
}: {
  brand: RenderBrand;
  kicker: string;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 24,
        color: brand.palette.text,
        opacity: 0.7,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt=""
            width={32}
            height={32}
            style={{ display: "block" }}
          />
        ) : null}
        <span style={{ fontWeight: 700 }}>{brand.name}</span>
      </span>
      <span>{kicker}</span>
    </div>
  );
}

export function Kicker({
  brand,
  label,
}: {
  brand: RenderBrand;
  label: string;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: brand.palette.accent,
      }}
    >
      <span
        style={{
          display: "flex",
          width: 28,
          height: 6,
          background: brand.palette.accent,
          borderRadius: 3,
        }}
      />
      {label}
    </div>
  );
}
