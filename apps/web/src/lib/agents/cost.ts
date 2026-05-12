/**
 * Best-effort cost estimation per LLM call.
 *
 * Rates are public list prices in USD per 1M tokens, rounded. They drift —
 * treat the resulting `costCents` as an indicator, not an invoice. Returns
 * null when we don't have a rate for the (provider, model) pair so we
 * never make numbers up.
 */

type Rate = { inputPer1M: number; outputPer1M: number };

const RATES: Record<string, Rate | undefined> = {
  // anthropic
  "anthropic:claude-sonnet-4-6": { inputPer1M: 3, outputPer1M: 15 },
  "anthropic:claude-haiku-4-5": { inputPer1M: 1, outputPer1M: 5 },
  // google
  "google:gemini-2.5-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "google:gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 5 },
  // openai
  "openai:gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "openai:gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  // ollama (local, free)
  "ollama:*": { inputPer1M: 0, outputPer1M: 0 },
};

export type Usage = {
  promptTokens?: number;
  completionTokens?: number;
} | undefined;

export type StageCost = {
  provider: string;
  model: string;
  usage: Usage;
  /**
   * Cents added by this stage as a float — for cheap models like Gemini
   * Flash a whole carousel can be a small fraction of a cent. Null when
   * no rate is configured. Display with `.toFixed(4)`.
   */
  cents: number | null;
};

function lookupRate(provider: string, model: string): Rate | undefined {
  return (
    RATES[`${provider}:${model}`] ??
    (provider === "ollama" ? RATES["ollama:*"] : undefined)
  );
}

export function estimateStageCost({
  provider,
  model,
  usage,
}: {
  provider: string;
  model: string;
  usage: Usage;
}): StageCost {
  const rate = lookupRate(provider, model);
  if (!rate || !usage) {
    return { provider, model, usage, cents: null };
  }
  const input = usage.promptTokens ?? 0;
  const output = usage.completionTokens ?? 0;
  const usd = (input * rate.inputPer1M + output * rate.outputPer1M) / 1_000_000;
  return { provider, model, usage, cents: usd * 100 };
}

/** Sum stage costs. If any stage is null AND non-zero usage, the sum is null
 *  (we don't want to under-report). Otherwise sum cents. */
export function sumCosts(stages: StageCost[]): number | null {
  let total = 0;
  for (const s of stages) {
    if (s.cents == null) {
      // No rate for this stage. If usage is zero (Ollama), treat as 0.
      const hadTokens =
        (s.usage?.promptTokens ?? 0) + (s.usage?.completionTokens ?? 0) > 0;
      if (hadTokens) return null;
      continue;
    }
    total += s.cents;
  }
  return total;
}
