/**
 * generate-imagen.ts — one-off image generation with Google Imagen 4
 * (imagen-4.0-ultra-generate-001). See
 * https://ai.google.dev/gemini-api/docs/imagen
 *
 * Adapted from generate-image.ts. Imagen uses a different API than Gemini image
 * gen: `ai.models.generateImages()` with a plain `prompt` (no reference-image
 * `contents` part) and reads bytes from response.generatedImages[].image.imageBytes.
 *
 * Scratch/manual script. NOT imported by the app. Run it by hand in the container:
 *
 *   ./scripts/dev.sh exec web pnpm dlx tsx src/scripts/generate-imagen.ts
 *
 * CLI: tsx generate-imagen.ts ["<prompt>"] ["<output.png>"]
 *
 * Needs a Gemini API key (GOOGLE_AI_API_KEY / GEMINI_API_KEY / GOOGLE_API_KEY).
 * Output is written under src/ so it appears on the host.
 */

import { writeFileSync } from "node:fs";

import { GoogleGenAI } from "@google/genai";

const DEFAULT_PROMPT = `A photorealistic, cinematic image of a complete Mercedes-Benz SL roadster in glossy
metallic blue driving at high speed on an open highway. The ENTIRE car is fully visible
within the frame — front bumper, both wheels, and rear all inside the image, nothing
cropped or cut off. Wide three-quarter front shot with the full vehicle centered and
comfortable margins around it. Strong motion blur on the road and background to convey
speed, golden-hour lighting with warm reflections on the glossy paint, high-end
automotive advertising aesthetic.`;

const DEFAULT_PROMPT_2 = `A park in the spring next to a lake, the sun sets across the lake, golden hour, red wildflowers`;

const MODEL = process.env.IMAGEN_MODEL ?? "imagen-4.0-ultra-generate-001";
const prompt = process.argv[2] ?? DEFAULT_PROMPT_2;
// Base output path; the image index is appended when more than one is returned.
const outputPath = process.argv[3] ?? `src/scripts/imagen-${formatTimestamp()}.png`;
// Supported: 1:1, 3:4, 4:3, 9:16, 16:9.
const ASPECT_RATIO = process.env.IMAGEN_ASPECT_RATIO ?? "9:16";
// NOTE: the "ultra" model supports only 1 image; standard/fast support up to 4.
const NUMBER_OF_IMAGES = Number(process.env.IMAGEN_NUM_IMAGES ?? "2");

function getApiKey(): string {
  const key =
    process.env.GOOGLE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "No API key found. Set GOOGLE_AI_API_KEY (or GEMINI_API_KEY / GOOGLE_API_KEY).",
    );
  }
  return key;
}

/** Filesystem-safe local timestamp: YYYY-MM-DD_HH-MM-SS-mmm (no colons). */
function formatTimestamp(d = new Date()): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}`
  );
}

/** Insert a numeric suffix before the file extension (img.png -> img-2.png). */
function withIndex(path: string, index: number): string {
  if (index === 0) return path;
  const dot = path.lastIndexOf(".");
  return dot === -1
    ? `${path}-${index + 1}`
    : `${path.slice(0, dot)}-${index + 1}${path.slice(dot)}`;
}

async function main(): Promise<void> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  console.log(`Generating ${NUMBER_OF_IMAGES} image(s) (model: ${MODEL})…`);
  const response = await ai.models.generateImages({
    model: MODEL,
    prompt,
    config: {
      numberOfImages: NUMBER_OF_IMAGES,
      aspectRatio: ASPECT_RATIO,
    },
  });

  const images = response.generatedImages ?? [];
  let imageCount = 0;

  for (const generated of images) {
    const imgBytes = generated.image?.imageBytes;
    if (!imgBytes) continue;
    const buffer = Buffer.from(imgBytes, "base64");
    const file = withIndex(outputPath, imageCount);
    writeFileSync(file, buffer);
    console.log(`Saved image to ${file}`);
    imageCount += 1;
  }

  if (imageCount === 0) {
    throw new Error(
      `No image returned. Raw response: ${JSON.stringify(response, null, 2)}`,
    );
  }
}

main().catch((err) => {
  console.error("Imagen generation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
