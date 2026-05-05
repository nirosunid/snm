import { ImageResponse } from "next/og";

import { HARDCODED_BRAND } from "@/lib/agents/brand";
import { SlideSchema } from "@/lib/agents/schemas";

export const runtime = "edge";

const SIZE = 1080;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = SlideSchema.safeParse({
    type: url.searchParams.get("type"),
    copy: url.searchParams.get("copy") ?? "",
  });
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const slide = parsed.data;

  const brand = HARDCODED_BRAND;
  const label =
    slide.type === "hook"
      ? "HOOK"
      : slide.type === "listicle_item"
        ? "TIP"
        : "CTA";
  const bodyFontSize =
    slide.type === "hook" ? 76 : slide.type === "listicle_item" ? 56 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: brand.palette.bg,
          color: brand.palette.text,
          fontFamily: "system-ui, sans-serif",
        }}
      >
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

        <div
          style={{
            display: "flex",
            fontSize: bodyFontSize,
            fontWeight: 700,
            lineHeight: 1.1,
            color: brand.palette.primary,
          }}
        >
          {slide.copy}
        </div>

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
          <span style={{ fontWeight: 700 }}>{brand.name}</span>
          <span>{slide.type}</span>
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
    },
  );
}
