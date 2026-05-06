/**
 * Dev-only smoke for the LLMClient against the planner stage.
 * Returns the raw response from generateObject so we can debug schema issues.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { llm } from "@/lib/agents/client";
import { currentUser, isStaff } from "@/lib/auth/session";

export const runtime = "nodejs";

const TinySchema = z.object({
  greeting: z.string(),
  count: z.number().int().min(1).max(5),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !isStaff(user)) {
    return NextResponse.json({ error: "Staff only." }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    stage?: "planner" | "writer" | "reviewer";
  };
  try {
    const r = await llm.object({
      stage: body.stage ?? "planner",
      schema: TinySchema,
      system: "You are a friendly counter.",
      prompt: "Greet the user warmly and pick a number from 1 to 5.",
    });
    return NextResponse.json({
      ok: true,
      provider: r.provider,
      model: r.model,
      object: r.object,
    });
  } catch (e) {
    const err = e as Error & { cause?: unknown };
    return NextResponse.json(
      {
        ok: false,
        message: err.message,
        name: err.name,
        cause: typeof err.cause === "object" ? JSON.stringify(err.cause) : String(err.cause ?? ""),
      },
      { status: 500 },
    );
  }
}
