/**
 * generate-image.ts — one-off Gemini image generation ("Nano Banana",
 * gemini-2.5-flash-image). See https://ai.google.dev/gemini-api/docs/image-generation
 *
 * Scratch/manual script. NOT imported by the app. Run it by hand inside the
 * `web` container:
 *
 *   ./scripts/dev.sh exec web pnpm add @google/genai
 *   ./scripts/dev.sh exec web pnpm dlx tsx src/scripts/generate-image.ts
 *
 * CLI: tsx generate-image.ts ["<prompt>"] ["<output.png>"]
 *
 * Needs a Gemini API key. The compose stack already injects GOOGLE_AI_API_KEY
 * from your .env into the web container; this script also accepts GEMINI_API_KEY
 * or GOOGLE_API_KEY. Output is written under src/ so it appears on the host.
 */

import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

const DEFAULT_PROMPT = `A photorealistic, cinematic image of a 2000 Mercedes-Benz SL roadster in glossy metallic blue driving at high
speed on an open highway. Low three-quarter front angle, sharp focus on the car with
strong motion blur on the road and background to convey speed, golden-hour lighting
with warm reflections on the glossy paint, shallow depth of field, high-end automotive
advertising aesthetic, vertical 9:16 framing.`;

// const MODEL = process.env.IMAGE_MODEL ?? "gemini-2.5-flash-image";
const MODEL = process.env.IMAGE_MODEL ?? "gemini-3.1-flash-image";
const prompt = process.argv[2] ?? DEFAULT_PROMPT;
// Base output path; if the model returns multiple images, an index is appended.
const outputPath = process.argv[3] ?? `src/scripts/image-${randomUUID()}.png`;
// Supported: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9.
const ASPECT_RATIO = process.env.IMAGE_ASPECT_RATIO ?? "9:16";
// Optional reference image — Gemini conditions on it (passed inline in contents).
const REFERENCE_IMAGE_URL =
  process.env.IMAGE_REFERENCE_URL ??
  "https://upload.wikimedia.org/wikipedia/commons/3/36/Mercedes_R230_front_20071102.jpg";

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

/** Insert a numeric suffix before the file extension (img.png -> img-2.png). */
function withIndex(path: string, index: number): string {
  if (index === 0) return path;
  const dot = path.lastIndexOf(".");
  return dot === -1
    ? `${path}-${index + 1}`
    : `${path.slice(0, dot)}-${index + 1}${path.slice(dot)}`;
}

/** Fetch a remote image and return it as a Gemini inlineData content part. */
async function loadImagePart(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch reference image ${url}: ${res.status}`);
  }
  const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  const data = Buffer.from(await res.arrayBuffer()).toString("base64");
  return { inlineData: { mimeType, data } };
}

async function main(): Promise<void> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  console.log(`Loading reference image…`);
  const referencePart = await loadImagePart(REFERENCE_IMAGE_URL);

  console.log(`Generating image (model: ${MODEL})…`);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [referencePart, { text: prompt }],
    config: {
      imageConfig: {
        aspectRatio: ASPECT_RATIO,
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  let imageCount = 0;

  for (const part of parts) {
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      const file = withIndex(outputPath, imageCount);
      writeFileSync(file, buffer);
      console.log(`Saved image to ${file}`);
      imageCount += 1;
    }
  }

  if (imageCount === 0) {
    throw new Error(
      `No image returned. Raw response: ${JSON.stringify(response, null, 2)}`,
    );
  }
}

main().catch((err) => {
  console.error("Image generation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
