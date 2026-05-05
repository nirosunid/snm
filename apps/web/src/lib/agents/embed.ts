/**
 * Embedding helper.
 *
 * Schema is locked at `vector(EMBEDDING_DIMENSION)` (default 1536, matching
 * OpenAI text-embedding-3-small). Different providers output different native
 * dimensions; we zero-pad up to EMBEDDING_DIMENSION before storage.
 *
 * Cosine similarity is mathematically unchanged by zero-padding (the appended
 * zeros contribute 0 to both the dot product and to ||v||), so retrieval
 * quality is preserved. The HNSW + vector_cosine_ops index keeps working.
 *
 * Important: do NOT mix samples from different providers in the same brand —
 * different latent spaces don't compare meaningfully even at the same
 * dimension. Pick one provider, ingest, and stick with it.
 *
 * Providers wired in MVP-1:
 *   - openai  (default)  — text-embedding-3-small, 1536 dims native, no padding.
 *   - ollama             — nomic-embed-text, 768 dims native, padded to 1536.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { createOllama } from "ollama-ai-provider";

export const EMBEDDING_DIMENSION = Number(
  process.env.EMBEDDING_DIMENSION ?? 1536,
);

type Provider = "openai" | "ollama";

function provider(): Provider {
  const p = (process.env.EMBEDDING_PROVIDER ?? "openai").toLowerCase();
  if (p === "openai" || p === "ollama") return p;
  throw new Error(
    `EMBEDDING_PROVIDER=${p} is not supported. Set "openai" or "ollama".`,
  );
}

function modelName(): string {
  if (process.env.EMBEDDING_MODEL) return process.env.EMBEDDING_MODEL;
  return provider() === "ollama" ? "nomic-embed-text" : "text-embedding-3-small";
}

function getEmbeddingModel() {
  const p = provider();
  const m = modelName();
  if (p === "ollama") {
    const raw =
      process.env.OLLAMA_BASE_URL ?? "http://host.docker.internal:11434";
    const trimmed = raw.replace(/\/+$/, "");
    const baseURL = /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
    return createOllama({ baseURL }).embedding(m);
  }
  return createOpenAI({}).embedding(m);
}

/** Zero-pad (or truncate) a vector to EMBEDDING_DIMENSION. */
function fitDim(v: number[]): number[] {
  if (v.length === EMBEDDING_DIMENSION) return v;
  if (v.length > EMBEDDING_DIMENSION) return v.slice(0, EMBEDDING_DIMENSION);
  return v.concat(new Array(EMBEDDING_DIMENSION - v.length).fill(0));
}

export async function embedTexts(
  texts: string[],
): Promise<{ embeddings: number[][]; model: string }> {
  if (texts.length === 0) return { embeddings: [], model: modelName() };
  const m = modelName();
  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values: texts,
  });
  return { embeddings: embeddings.map(fitDim), model: m };
}

export async function embedText(
  text: string,
): Promise<{ embedding: number[]; model: string }> {
  const m = modelName();
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text,
  });
  return { embedding: fitDim(embedding), model: m };
}

/** Format a number[] as a Postgres `vector` literal: `[0.1,0.2,...]` */
export function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
