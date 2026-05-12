import { BrandFooter } from "./_shared";
import type { TemplateDef } from "./types";

export const ctaA: TemplateDef = {
  key: "cta_a",
  name: "CTA — accent slab",
  type: "cta",
  active: true,
  render: ({ brand, props }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: brand.palette.primary,
        color: brand.palette.background,
        fontFamily: `"${brand.font}", sans-serif`,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1.05,
          color: brand.palette.background,
        }}
      >
        {props.copy ?? ""}
      </div>

      <BrandFooter brand={brand} />
    </div>
  ),
};

