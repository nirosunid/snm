/**
 * Sync generation — Issue #2 tracer bullet, brand-driven from Issue #4 onward,
 * voice-aware from Issue #5, routed through the LLMClient abstraction from
 * Issue #8.
 *
 * One LLM call against the supplied brand brief + retrieved voice samples
 * + user-supplied topic, returns a structured DraftPayload. Replaced in
 * later issues by a multi-stage pipeline.
 */

import { brandBriefText, type BrandLike } from "./brand";
import { llm } from "./client";
import {
  DraftPayloadSchema,
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
  const voice = await getBrandVoice(
    options?.brandId,
    topic,
    options?.voiceK ?? 5,
  );

  let result: Awaited<ReturnType<typeof llm.object<typeof DraftPayloadSchema>>>;
  try {
    result = await llm.object({
      stage: "writer",
      schema: DraftPayloadSchema,
      system: systemPrompt(brand, voice),
      prompt: `Topic for the carousel: ${topic}`,
      // Anthropic-only: cache the system prompt so subsequent generations
      // for the same brand reuse the brief + voice block.
      cacheSystem: true,
    });
  } catch (err) {
    const base = err instanceof Error ? err.message : String(err);
    throw new Error(
      `LLM call failed in writer stage. Underlying error: ${base}`,
    );
  }

  return {
    brand: brand.name,
    topic,
    provider: result.provider,
    model: result.model,
    draft: result.object,
    voiceSamplesUsed: voice.length,
  };
}
