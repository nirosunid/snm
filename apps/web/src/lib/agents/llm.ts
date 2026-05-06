/**
 * LLM factory — model-agnostic across providers via the Vercel AI SDK.
 *
 * Issue #2 (tracer bullet) uses this directly from the /api/generate route.
 * The full per-stage client with overrides (LLM_PLANNER_*, LLM_WRITER_*,
 * LLM_REVIEWER_*) lands in later issues when the pipeline grows beyond a
 * single LLM call.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import { createOllama } from "ollama-ai-provider";

export type LLMConfig = {
  provider: "anthropic" | "google" | "openai" | "ollama";
  model: string;
};

const PROVIDER_ALIASES: Record<string, LLMConfig["provider"]> = {
  anthropic: "anthropic",
  google: "google",
  "google-genai": "google",
  gemini: "google",
  openai: "openai",
  ollama: "ollama",
};

export function resolveConfig(stage?: string): LLMConfig {
  // Treat empty strings as "not set" — docker-compose's `${VAR:-}` syntax
  // exports vars as "" when not in .env, and `??` only falls back on
  // null/undefined. `||` covers both cases.
  const defaultProvider = process.env.DEFAULT_LLM_PROVIDER || "ollama";
  const defaultModel = process.env.DEFAULT_LLM_MODEL || "llama3.2";

  let providerRaw: string;
  let model: string;
  if (stage) {
    const upper = stage.toUpperCase();
    providerRaw = process.env[`LLM_${upper}_PROVIDER`] || defaultProvider;
    model = process.env[`LLM_${upper}_MODEL`] || defaultModel;
  } else {
    providerRaw = defaultProvider;
    model = defaultModel;
  }

  const provider = PROVIDER_ALIASES[providerRaw.toLowerCase()];
  if (!provider) {
    throw new Error(
      `Unknown LLM provider: ${providerRaw!}. ` +
        "Set DEFAULT_LLM_PROVIDER to one of: anthropic, google, openai, ollama.",
    );
  }
  return { provider, model };
}

export function buildLanguageModel(config: LLMConfig): LanguageModelV1 {
  switch (config.provider) {
    case "anthropic": {
      const anthropic = createAnthropic({});
      return anthropic(config.model);
    }
    case "google": {
      // The SDK reads GOOGLE_GENERATIVE_AI_API_KEY by default, but our
      // docker-compose exports the key as GOOGLE_AI_API_KEY (matches the
      // products project's env naming). Pass it explicitly so either name
      // works.
      const apiKey =
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GOOGLE_AI_API_KEY;
      const google = createGoogleGenerativeAI(
        apiKey ? { apiKey } : {},
      );
      return google(config.model);
    }
    case "openai": {
      const openai = createOpenAI({});
      return openai(config.model);
    }
    case "ollama": {
      const raw =
        process.env.OLLAMA_BASE_URL ?? "http://host.docker.internal:11434";
      const trimmed = raw.replace(/\/+$/, "");
      const baseURL = /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
      const ollama = createOllama({ baseURL });
      return ollama(config.model);
    }
  }
}

export function getLanguageModel(stage?: string): {
  model: LanguageModelV1;
  config: LLMConfig;
} {
  const config = resolveConfig(stage);
  return { model: buildLanguageModel(config), config };
}
