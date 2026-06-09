/**
 * generate-veo-video.ts — one-off Google Veo (Gemini) text-to-video generation.
 *
 * Scratch/manual script. NOT imported by the app. Run it by hand inside the
 * `web` container (see the run instructions at the bottom of this file).
 *
 * Requires the `@google/genai` package, which is NOT a project dependency.
 * Install it ephemerally in the running container before running (it won't
 * persist across an image rebuild — that's fine for a one-off):
 *
 *   ./scripts/dev.sh exec web pnpm add @google/genai
 *   ./scripts/dev.sh exec web pnpm dlx tsx src/scripts/generate-veo-video.ts
 *
 * Needs a Gemini API key. The compose stack already injects GOOGLE_AI_API_KEY
 * from your .env into the web container; this script also accepts GEMINI_API_KEY
 * or GOOGLE_API_KEY.
 */

import { randomUUID } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

const DEFAULT_PROMPT = `Create a polished 8-second promo video for a compact one-door refrigerator, using the attached product image as the exact visual reference for the hero product. The refrigerator must match the reference image closely in shape, proportions, handle placement, finish, and color. It is the VORTEX VD9SRD01M, glossy red, compact, modern, elegant, with a premium but practical personality.

Style: premium appliance commercial, cinematic, clean, elegant, modern European lifestyle aesthetic.
Aspect ratio: 9:16 (vertical / portrait).
Duration: 8 seconds.
Visual quality: photorealistic, high-end commercial lighting, refined reflections, realistic product surfaces, tasteful styling.
Setting: minimalist modern kitchen with soft daylight, white stone or light neutral surfaces, subtle wood accents, airy and uncluttered composition.
Mood: stylish, compact, practical, warm, aspirational.
Color palette: red, white, chrome, soft natural wood, gentle daylight neutrals.

Important:
- Use the uploaded product image as the exact product reference.
- Do not redesign the fridge.
- Do not change the color.
- Do not turn it into a generic retro fridge.
- Keep the product believable, realistic, and faithful to the original listing photo.
- No extra appliances competing for attention.
- No distorted geometry.
- No fake brand names or altered logo areas.

Camera and motion:
- Smooth dolly shots
- Slow cinematic orbit
- Macro close-ups
- Clean transitions
- Subtle depth of field
- Premium ad pacing

Shot sequence:
1. Opening hero reveal: the red fridge stands in a clean modern kitchen, emerging into soft natural light, glossy reflections moving across the surface.
2. Beauty orbit: camera slowly moves around the fridge at a 3/4 angle, highlighting its compact size, elegant red finish, and modern silhouette.
3. Detail close-up: macro shot of the handle and door edge, showing material quality and refined finish.
4. Door opening shot: the fridge opens smoothly to reveal a neat, fresh interior with cold drinks, fruit, dairy, and snacks arranged attractively.
5. Lifestyle fit shot: show the fridge naturally integrated into a small but stylish apartment kitchen or office kitchenette, emphasizing that it fits beautifully in compact spaces.
6. Final hero shot: front-facing product shot with elegant reflections, shallow depth of field, and a premium end-card composition.

Audio: instrumental music and ambient sound only. No voice-over, no spoken narration, no dialogue, no talking, no lip-sync.

On-screen text in Romanian:
- “VORTEX VD9SRD01M”
- “93L capacitate”
- “H 83,5 cm”
- “Control mecanic al temperaturii”
- “Functionare silentioasa”
- “Compact prin dimensiuni. Remarcabil prin prezenta.”

Sound design:
- soft premium electronic ambient music
- subtle modern commercial beat
- delicate refrigerator door sound
- faint kitchen room tone
- clean cinematic end hit

Cinematography:
- realistic lens behavior
- premium commercial framing
- soft highlights on glossy red surfaces
- natural reflections
- tasteful contrast
- no harsh shadows
- refined product-centric composition

End frame:
The refrigerator centered beautifully in frame with minimal background, premium lighting, and elegant negative space for branding or retail callout.

Negative prompt:
cartoon, illustration, low detail, warped fridge, incorrect proportions, extra doors, wrong handle, wrong color, fake product, messy kitchen, clutter, cheap lighting, exaggerated retro styling, overacting, noisy frame, text glitches, distorted interior, unrealistic materials`;

// Product reference images. Veo 3.1 supports up to 3 "asset" reference images.
const REFERENCE_IMAGE_URLS = [
  "https://lcdn.altex.ro/media/catalog/product/f/r/frgvd9srd01m_1_c2703c65.jpg",
  "https://lcdn.altex.ro/media/catalog/product/f/r/frgvd9srd01m_2_e6b2c9bf.jpg",
  "https://lcdn.altex.ro/media/catalog/product/f/r/frgvd9srd01m_4_89f211aa.jpg",
];


// const MODEL = process.env.VEO_MODEL ?? "veo-3.1-generate-preview";
const MODEL = process.env.VEO_MODEL ?? "veo-3.1-fast-generate-preview";
// const MODEL = process.env.VEO_MODEL ?? "veo-3.1-lite-generate-preview";
// CLI: tsx generate-veo-video.ts ["<prompt>"] ["<output.mp4>"]
const prompt = process.argv[2] ?? DEFAULT_PROMPT;
const outputPath = process.argv[3] ?? `src/scripts/veo-${randomUUID()}.mp4`;

// Output controls. NOTE: 1080p is only supported with the 16:9 aspect ratio,
// and the "lite"/"fast" model variants may cap at 720p.
const RESOLUTION = (process.env.VEO_RESOLUTION ?? "720p") as "720p" | "1080p";
const ASPECT_RATIO = (process.env.VEO_ASPECT_RATIO ?? "9:16") as "16:9" | "9:16";
// Billed per second of generated video. Without this the model uses a longer
// default. Veo 3.x supports up to ~8s per clip. 8s × $0.05 (Lite 720p) = $0.40.
const DURATION_SECONDS = Number(process.env.VEO_DURATION_SECONDS ?? "8");

const POLL_INTERVAL_MS = 10_000;

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

/** Fetch a remote image and convert it to the inline form Veo expects. */
async function loadReferenceImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch reference image ${url}: ${res.status}`);
  }
  const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  const imageBytes = Buffer.from(await res.arrayBuffer()).toString("base64");
  return { image: { imageBytes, mimeType }, referenceType: "asset" as const };
}

async function main(): Promise<void> {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  console.log(`Loading ${REFERENCE_IMAGE_URLS.length} reference image(s)…`);
  const referenceImages = await Promise.all(
    REFERENCE_IMAGE_URLS.map(loadReferenceImage),
  );

  console.log(`Starting Veo generation (model: ${MODEL})…`);
  let operation = await ai.models.generateVideos({
    model: MODEL,
    prompt,
    config: {
      resolution: RESOLUTION,
      aspectRatio: ASPECT_RATIO,
      durationSeconds: DURATION_SECONDS,
      referenceImages,
    },
  });

  // Poll the long-running operation until the video is ready.
  while (!operation.done) {
    console.log("Waiting for video generation to complete…");
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) {
    throw new Error(
      `Operation finished but returned no video. Raw response: ${JSON.stringify(
        operation.response,
      )}`,
    );
  }

  console.log(`Downloading video to ${outputPath}…`);
  await ai.files.download({ file: video, downloadPath: outputPath });
  console.log(`Generated video saved to ${outputPath}`);
}

main().catch((err) => {
  console.error("Veo generation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
