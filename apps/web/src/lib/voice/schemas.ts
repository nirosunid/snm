import { z } from "zod";

export const AddVoiceSamplesInput = z.object({
  brandId: z.union([z.number().int().positive(), z.string().min(1)]),
  samples: z.array(z.string().min(1)).min(1).max(200),
});
export type AddVoiceSamplesInputType = z.infer<typeof AddVoiceSamplesInput>;

/**
 * Split a paste blob into individual samples.
 *
 * Heuristic: prefer splitting on blank-line boundaries (one or more empty
 * lines), preserving multi-paragraph samples. If the paste contains no blank
 * lines, fall back to splitting on every newline. Trims whitespace and drops
 * empty entries.
 */
export function splitSamples(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const blankLineSplit = trimmed.split(/\n\s*\n+/);
  const parts =
    blankLineSplit.length > 1 ? blankLineSplit : trimmed.split(/\r?\n+/);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}
