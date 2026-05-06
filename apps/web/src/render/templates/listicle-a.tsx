import { BrandFooter } from "./_shared";
import type { TemplateDef } from "./types";

export const listicleA: TemplateDef = {
  key: "listicle_a",
  name: "Listicle — numbered point",
  type: "listicle_item",
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
        background: brand.palette.background,
        color: brand.palette.text,
        fontFamily: `"${brand.font}", sans-serif`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 24,
        }}
      >
        <span
          style={{
            display: "flex",
            fontSize: 220,
            fontWeight: 900,
            lineHeight: 0.9,
            color: brand.palette.accent,
          }}
        >
          1
        </span>
        <span
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: brand.palette.secondary,
          }}
        >
          THE TIP
        </span>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 600,
          lineHeight: 1.15,
          color: brand.palette.primary,
        }}
      >
        {props.copy ?? ""}
      </div>

      <BrandFooter brand={brand} kicker="tip" />
    </div>
  ),
};
