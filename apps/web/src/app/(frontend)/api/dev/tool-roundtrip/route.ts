/**
 * Dev-only smoke endpoint for the LLMClient tool-call round-trip.
 *
 * Exposes a stub `getMagicNumber` tool that returns a known constant. The
 * endpoint asks the LLM to call it and confirms the tool ran. Wraps Vercel
 * AI SDK's `generateText` via the LLMClient abstraction so this also
 * exercises stage-aware provider selection.
 */

import { tool } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { llm } from "@/lib/agents/client";
import { currentUser, isStaff } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAGIC_NUMBER = 4711;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !isStaff(user)) {
    return NextResponse.json(
      { error: "Staff only." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    stage?: "planner" | "writer" | "reviewer";
    toolChoice?: "auto" | "required";
  };

  let toolExecuted = false;
  const getMagicNumber = tool({
    description:
      "Returns the magic number. Always call this before answering questions about the magic number.",
    parameters: z.object({}),
    execute: async () => {
      toolExecuted = true;
      return { value: MAGIC_NUMBER };
    },
  });

  try {
    const result = await llm.text({
      stage: body.stage,
      system:
        "You are a tester. When asked for the magic number, you must call the getMagicNumber tool first, then state the number in your reply.",
      prompt: "What is the magic number? Call the tool and tell me.",
      tools: { getMagicNumber },
      // Ollama doesn't support 'required'; default to 'auto' so the LLM may
      // (or may not) call the tool. Caller can override via body.
      toolChoice: body.toolChoice ?? "auto",
      maxSteps: 3,
    });

    // The toolCalls/toolResults arrays carry typed entries we don't need to
    // model in the response — stringify and forward.
    const toolCalls = (result.toolCalls as Array<{
      toolName: string;
      args: unknown;
    }>).map((c) => ({ name: c.toolName, args: c.args }));
    const toolResults = (result.toolResults as Array<{
      toolName: string;
      result: unknown;
    }>).map((r) => ({ name: r.toolName, result: r.result }));

    return NextResponse.json({
      ok: true,
      toolExecuted,
      provider: result.provider,
      model: result.model,
      text: result.text,
      toolCalls,
      toolResults,
      providerMetadata: result.raw.providerMetadata ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
