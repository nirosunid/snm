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
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: brand.palette.accent,
        }}
      >
        →  YOUR MOVE
      </div>

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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          color: brand.palette.background,
          opacity: 0.8,
        }}
      >
        <span style={{ fontWeight: 700 }}>{brand.name}</span>
        <span>cta</span>
      </div>
    </div>
  ),
};

