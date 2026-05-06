import { ImageResponse } from "next/og";
import { getPayload } from "payload";

import config from "@payload-config";

import { HARDCODED_BRAND } from "@/lib/agents/brand";
import { currentUser } from "@/lib/auth/session";
import { parseFixtureBrandId } from "@/render/fixtures";
import { findTemplateByType, getTemplate } from "@/render/templates";
import { SLIDE_SIZE, withDefaults } from "@/render/templates/_shared";
import type { RenderBrand, RenderProps } from "@/render/templates";

// nodejs runtime so we can call Payload Local API for brand + media reads.
// next/og's ImageResponse runs fine in node — Satori is the same library.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const templateKey = url.searchParams.get("templateKey") ?? "";
  const slideType = url.searchParams.get("type") ?? "";
  const copy = url.searchParams.get("copy") ?? "";
  const imageUrl = url.searchParams.get("imageUrl") ?? "";
  const caption = url.searchParams.get("caption") ?? "";
  const attribution = url.searchParams.get("attribution") ?? "";
  const brandIdRaw = url.searchParams.get("brandId");

  const template = templateKey
    ? getTemplate(templateKey)
    : slideType
      ? findTemplateByType(
          slideType as Parameters<typeof findTemplateByType>[0],
        )
      : undefined;

  if (!template) {
    return new Response(
      JSON.stringify({
        error: templateKey
          ? `Unknown templateKey: ${templateKey}`
          : `Unknown slide type: ${slideType}`,
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const props: RenderProps = { copy, imageUrl, caption, attribution };
  const brand = await loadBrand(brandIdRaw);

  return new ImageResponse(template.render({ brand, props }), {
    width: SLIDE_SIZE,
    height: SLIDE_SIZE,
  });
}

async function loadBrand(brandIdRaw: string | null): Promise<RenderBrand> {
  // Dev fixtures: brandId=fixture:<key> bypasses the brands collection
  // entirely. Anonymously-callable so /dev/templates can render previews
  // without an extra auth round-trip.
  const fixture = parseFixtureBrandId(brandIdRaw);
  if (fixture) return withDefaults(fixture);

  const brandId = brandIdRaw ? Number(brandIdRaw) : undefined;
  if (!brandId || !Number.isInteger(brandId) || brandId <= 0) {
    return withDefaults(HARDCODED_BRAND_AS_RENDER);
  }
  const user = await currentUser();
  if (!user) return withDefaults(HARDCODED_BRAND_AS_RENDER);
  const payload = await getPayload({ config });
  try {
    const record = await payload.findByID({
      collection: "brands",
      id: brandId,
      user,
      overrideAccess: false,
      depth: 1,
    });
    const logo =
      typeof record.logo === "object" && record.logo
        ? record.logo
        : null;
    return withDefaults({
      name: record.name,
      font: record.font ?? "Inter",
      palette: {
        primary: record.palette?.primary ?? "",
        secondary: record.palette?.secondary ?? "",
        accent: record.palette?.accent ?? "",
        background: record.palette?.background ?? "",
        text: record.palette?.text ?? "",
      } as RenderBrand["palette"],
      logoUrl: logo?.url ?? null,
    });
  } catch {
    return withDefaults(HARDCODED_BRAND_AS_RENDER);
  }
}

const HARDCODED_BRAND_AS_RENDER: Partial<RenderBrand> = {
  name: HARDCODED_BRAND.name,
  font: "Inter",
  palette: {
    primary: HARDCODED_BRAND.palette.primary ?? "",
    secondary: HARDCODED_BRAND.palette.secondary ?? "",
    accent: HARDCODED_BRAND.palette.accent ?? "",
    background: HARDCODED_BRAND.palette.background ?? "",
    text: HARDCODED_BRAND.palette.text ?? "",
  } as RenderBrand["palette"],
};
