/**
 * Hardcoded brand brief used by the Issue #2 tracer bullet.
 *
 * Replaced in Issue #4 by reads from the Payload `brands` collection.
 */

export const HARDCODED_BRAND = {
  name: "Mercedes-Benz",
  niche: "luxury automotive — engineering, design, and driving experience",
  audience:
    "35-55 year-old professionals who value craftsmanship, performance, and understated status",
  tone: "refined, confident, understated; quality and detail over hype",
  dos: [
    "lead with a specific design or engineering detail",
    "use evocative, sensory language about driving and craftsmanship",
    "name concrete features or specs when they make the point sharper",
  ],
  donts: [
    "no tired luxury clichés ('ultimate driving experience', 'unparalleled')",
    "no direct comparisons or jabs at named competitors",
    "no superlatives that aren't grounded in a specific feature",
  ],
  palette: {
    primary: "#0F1419",
    accent: "#7A8A9A",
    bg: "#F4F4F4",
    text: "#0F1419",
  },
  font: "Inter",
} as const;

export function brandBriefText(): string {
  const b = HARDCODED_BRAND;
  const dos = b.dos.map((d) => `  - ${d}`).join("\n");
  const donts = b.donts.map((d) => `  - ${d}`).join("\n");
  return [
    `Brand: ${b.name}`,
    `Niche: ${b.niche}`,
    `Audience: ${b.audience}`,
    `Tone: ${b.tone}`,
    `Do:\n${dos}`,
    `Don't:\n${donts}`,
    "",
  ].join("\n");
}
