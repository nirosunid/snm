/**
 * Sync generation — Issue #2 tracer bullet.
 *
 * One LLM call against the hardcoded brand brief + user-supplied topic,
 * returns a structured DraftPayload. Replaced in later issues by a
 * multi-stage pipeline (planner → writer → visual director → editor).
 */

import { generateObject } from "ai";

import { brandBriefText, HARDCODED_BRAND } from "./brand";
import { getLanguageModel } from "./llm";
import {
  DraftPayloadSchema,
  type DraftPayload,
  type GenerateResponse,
} from "./schemas";

const SYSTEM_PROMPT_TEMPLATE = `\
You are a social-media content writer working within a brand brief.

{brief}

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

function systemPrompt(): string {
  return SYSTEM_PROMPT_TEMPLATE.replace("{brief}", brandBriefText());
}

export async function generateDraft(topic: string): Promise<GenerateResponse> {
  const { model, config } = getLanguageModel();

  let draft: DraftPayload;
  try {
    const result = await generateObject({
      model,
      mode: "json",
      schema: DraftPayloadSchema,
      system: systemPrompt(),
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
    brand: HARDCODED_BRAND.name,
    topic,
    provider: config.provider,
    model: config.model,
    draft,
  };
}
