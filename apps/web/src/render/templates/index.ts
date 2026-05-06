/**
 * Template registry. Source of truth for which slide templates exist.
 *
 * Add a new template:
 * 1. Drop a `<key>.tsx` next to this file exporting a `TemplateDef`.
 * 2. Append it to TEMPLATES below.
 * 3. Restart the web service — `seedTemplates` (called from payload.config
 *    onInit) will create the matching `templates` row on next boot.
 */

import { ctaA } from "./cta-a";
import { hookA } from "./hook-a";
import { imageCaptionA } from "./image-caption-a";
import { listicleA } from "./listicle-a";
import { quoteA } from "./quote-a";
import type { TemplateDef } from "./types";

export const TEMPLATES: TemplateDef[] = [
  hookA,
  listicleA,
  ctaA,
  quoteA,
  imageCaptionA,
];

const BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

export function getTemplate(key: string): TemplateDef | undefined {
  return BY_KEY.get(key);
}

/** First active template that fulfils the given slide type, if any. */
export function findTemplateByType(
  type: TemplateDef["type"],
): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.active && t.type === type);
}

export type { TemplateDef, RenderBrand, RenderProps } from "./types";
