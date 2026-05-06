import { BrandFooter } from "./_shared";
import type { TemplateDef } from "./types";

export const quoteA: TemplateDef = {
  key: "quote_a",
  name: "Quote — large pull quote",
  type: "quote",
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
          fontSize: 220,
          lineHeight: 0.7,
          fontWeight: 800,
          color: brand.palette.accent,
        }}
      >
        “
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontStyle: "italic",
            fontWeight: 500,
            lineHeight: 1.2,
            color: brand.palette.primary,
          }}
        >
          {props.copy ?? ""}
        </div>
        {props.attribution ? (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 600,
              color: brand.palette.secondary,
            }}
          >
            — {props.attribution}
          </div>
        ) : null}
      </div>

      <BrandFooter brand={brand} kicker="quote" />
    </div>
  ),
};
