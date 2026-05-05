/**
 * Sync generation — Issue #2 tracer bullet, brand-driven from Issue #4 onward.
 *
 * One LLM call against the supplied brand brief + retrieved voice samples
 * (Issue #5) + user-supplied topic, returns a structured DraftPayload.
 * Replaced in later issues by a multi-stage pipeline.
 */

import { generateObject } from "ai";

import { brandBriefText, type BrandLike } from "./brand";
import { getLanguageModel } from "./llm";
import {
  DraftPayloadSchema,
  type DraftPayload,
  type GenerateResponse,
} from "./schemas";
import { getBrandVoice } from "@/lib/voice/retrieval";

const SYSTEM_PROMPT_TEMPLATE = `\
You are a social-media content writer working within a brand brief.

{brief}{voice}

You produce structured carousel drafts as JSON. Each carousel has 3 slides:
1. A \`hook\` slide: a short, intriguing headline (8-14 words) that earns the swipe.
2. A \`listicle_item\` slide: one concrete, actionable tip in 12-25 words.
3. A \`cta\` slide: a single closing line (5-12 words) that drives engagement.

Stay strictly within the tone, dos, and don'ts above. Never include URLs in
the slide text — Instagram blocks them and we surface link-in-bio CTAs separately.

Respond with JSON exactly in this shape (replace the example text, keep the
field names, slide \`type\` values, and array order):

{
  "slides": [
    { "type": "hook", "copy": "..." },
    { "type": "listicle_item", "copy": "..." },
    { "type": "cta", "copy": "..." }
  ],
  "caption": "...",
  "hashtags": ["one", "two", "three"]
}
`;

function voiceSection(samples: string[]): string {
  if (samples.length === 0) return "";
  const block = samples.map((s, i) => `[${i + 1}] ${s}`).join("\n\n");
  return `\n\nVoice samples — mimic this style closely (rhythm, vocabulary, sentence shape):\n\n${block}\n`;
}

function systemPrompt(brand: BrandLike, voice: string[]): string {
  return SYSTEM_PROMPT_TEMPLATE.replace("{brief}", brandBriefText(brand)).replace(
    "{voice}",
    voiceSection(voice),
  );
}

export async function generateDraft(
  topic: string,
  brand: BrandLike,
  options?: { brandId?: number; voiceK?: number },
): Promise<GenerateResponse> {
  const { model, config } = getLanguageModel();

  const voice = await getBrandVoice(
    options?.brandId,
    topic,
    options?.voiceK ?? 5,
  );

  let draft: DraftPayload;
  try {
    const result = await generateObject({
      model,
      mode: "json",
      schema: DraftPayloadSchema,
      system: systemPrompt(brand, voice),
      prompt: `Topic for the carousel: ${topic}`,
    });
    draft = result.object;
  } catch (err) {
    const base = err instanceof Error ? err.message : String(err);
    const ollamaHint =
      config.provider === "ollama"
        ? ` If you're using ollama, check that \`ollama pull ${config.model}\` has run and that OLLAMA_BASE_URL is reachable from the web container (default http://host.docker.internal:11434).`
        : "";
    throw new Error(
      `LLM call failed (provider=${config.provider}, model=${config.model}).${ollamaHint} Underlying error: ${base}`,
    );
  }

  return {
    brand: brand.name,
    topic,
    provider: config.provider,
    model: config.model,
    draft,
    voiceSamplesUsed: voice.length,
  };
}
