import { BrandFooter } from "./_shared";
import type { TemplateDef } from "./types";

export const hookA: TemplateDef = {
  key: "hook_a",
  name: "Hook — bold left rule",
  type: "hook",
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
          fontSize: 88,
          fontWeight: 800,
          lineHeight: 1.04,
          color: brand.palette.primary,
        }}
      >
        {props.copy ?? ""}
      </div>

      <BrandFooter brand={brand} />
    </div>
  ),
};
