/**
 * LLMClient — single entry point for every LLM call in the app.
 *
 * Wraps Vercel AI SDK's `generateObject` and `generateText` with:
 *  - Stage-aware provider selection (LLM_PLANNER_*, LLM_WRITER_*, LLM_REVIEWER_*
 *    with DEFAULT_LLM_* fallback) via `getLanguageModel(stage)`.
 *  - Optional Anthropic prompt-caching on the system message.
 *  - Optional tool support (Vercel AI SDK `tool()`).
 *
 * Business code should not import `ai` directly — use this client so we keep
 * one place to add tracing, retries, prompt-cache opt-in, etc.
 */

import {
  generateObject,
  generateText,
  type CoreTool,
} from "ai";
import type { z } from "zod";

type GenerateTextReturn = Awaited<
  ReturnType<typeof generateText<Record<string, CoreTool>>>
>;
type GenerateObjectReturn<S extends z.ZodTypeAny> = Awaited<
  ReturnType<typeof generateObject<z.infer<S>>>
>;

import { getLanguageModel } from "./llm";

export type LLMStage = "planner" | "writer" | "reviewer";

type CommonOpts = {
  /** Per-stage provider override; undefined uses DEFAULT_LLM_*. */
  stage?: LLMStage;
  /** System prompt. Cached on Anthropic when `cacheSystem` is true. */
  system?: string;
  /**
   * Mark the system prompt as cacheable on Anthropic. Other providers ignore
   * this. Verify cache hits via `result.providerMetadata.anthropic`.
   */
  cacheSystem?: boolean;
  /** Available tools, keyed by tool name. */
  tools?: Record<string, CoreTool>;
  /** Force the model to call (one of) the tool(s). */
  toolChoice?: "auto" | "required" | "none" | { type: "tool"; toolName: string };
  /** Cap multi-step tool round-trips. Defaults to 1 (no automatic continuation). */
  maxSteps?: number;
};

export type ObjectOpts<S extends z.ZodTypeAny> = CommonOpts & {
  prompt: string;
  schema: S;
  /** Force JSON-mode output — required for small Ollama models that fail at tool-calling JSON. */
  mode?: "auto" | "json";
};

export type TextOpts = CommonOpts & {
  prompt: string;
};

export type ObjectResult<S extends z.ZodTypeAny> = {
  object: z.infer<S>;
  provider: string;
  model: string;
  raw: GenerateObjectReturn<S>;
};

export type TextResult = {
  text: string;
  provider: string;
  model: string;
  toolCalls: GenerateTextReturn["toolCalls"];
  toolResults: GenerateTextReturn["toolResults"];
  raw: GenerateTextReturn;
};

function systemAsCachedMessage(system: string) {
  // Anthropic prompt-cache hint via providerOptions on the system message.
  // Other providers see plain text; the metadata is silently ignored by
  // non-anthropic adapters.
  return {
    role: "system" as const,
    content: system,
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  };
}

export class LLMClient {
  /** Generate a typed structured object via `generateObject`. */
  async object<S extends z.ZodTypeAny>(
    opts: ObjectOpts<S>,
  ): Promise<ObjectResult<S>> {
    const { model, config } = getLanguageModel(opts.stage);
    // Mode selection:
    //   - Ollama: force "json". Small models (3B-class) reliably emit JSON
    //     with this mode but fail at tool-calling, which the SDK's "auto"
    //     mode picks for them.
    //   - Everyone else (anthropic, google, openai): let the SDK pick. These
    //     providers have native structured-output APIs that the SDK uses
    //     under "auto".
    // Caller can override either via opts.mode.
    const resolvedMode =
      opts.mode ?? (config.provider === "ollama" ? "json" : "auto");
    const result = await generateObject({
      model,
      mode: resolvedMode,
      schema: opts.schema,
      // Caching the system prompt on Anthropic: pass via messages so we can
      // attach providerOptions to the system block.
      ...(opts.cacheSystem && opts.system
        ? {
            messages: [
              systemAsCachedMessage(opts.system),
              { role: "user" as const, content: opts.prompt },
            ],
          }
        : {
            system: opts.system,
            prompt: opts.prompt,
          }),
    });
    return {
      object: result.object as z.infer<S>,
      provider: config.provider,
      model: config.model,
      raw: result as GenerateObjectReturn<S>,
    };
  }

  /** Generate free-form text, optionally with tools. */
  async text(opts: TextOpts): Promise<TextResult> {
    const { model, config } = getLanguageModel(opts.stage);
    const result = await generateText({
      model,
      tools: opts.tools,
      toolChoice: opts.toolChoice,
      maxSteps: opts.maxSteps ?? 1,
      ...(opts.cacheSystem && opts.system
        ? {
            messages: [
              systemAsCachedMessage(opts.system),
              { role: "user" as const, content: opts.prompt },
            ],
          }
        : {
            system: opts.system,
            prompt: opts.prompt,
          }),
    });
    return {
      text: result.text,
      provider: config.provider,
      model: config.model,
      toolCalls: result.toolCalls as GenerateTextReturn["toolCalls"],
      toolResults: result.toolResults as GenerateTextReturn["toolResults"],
      raw: result as GenerateTextReturn,
    };
  }
}

/** Process-wide singleton; cheap to share. */
export const llm = new LLMClient();
