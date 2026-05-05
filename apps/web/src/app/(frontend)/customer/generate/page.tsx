"use client";

import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { GenerateResponse } from "@/lib/agents/schemas";
import { routes } from "@/lib/routes";

export default function GeneratePlaygroundPage() {
  const [topic, setTopic] = useState("3 design details that define a Mercedes-Benz interior");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    setSlideIdx(0);
    try {
      const res = await fetch(routes.api.customer.generate(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json?.error === "string" ? json.error : `HTTP ${res.status}`);
        return;
      }
      setResult(json as GenerateResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Generate playground</h1>
        <p className="mt-1 text-muted-foreground">
          Issue #2 tracer bullet — hardcoded brand brief, single LLM call,
          structured carousel draft.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
          <CardDescription>
            Describe a topic in one line. The agent drafts a 3-slide carousel + caption.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="3 design details that define…"
            />
          </div>
          <Button
            onClick={onGenerate}
            disabled={loading || topic.trim().length < 3}
            className="w-full sm:w-auto"
          >
            {loading ? "Generating…" : "Generate"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription className="break-words whitespace-pre-wrap">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {result && (() => {
        const slides = result.draft.slides;
        const idx = Math.min(slideIdx, slides.length - 1);
        const slide = slides[idx];
        const src = routes.api.customer.render({ type: slide.type, copy: slide.copy });
        return (
          <Card>
            <CardHeader>
              <CardTitle>Draft</CardTitle>
              <CardDescription>
                {result.brand} · {result.provider}/{result.model}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <figure className="mx-auto max-w-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${slide.type} slide`}
                  className="block aspect-square w-full rounded-md border bg-muted object-contain"
                />
                <figcaption className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
                    disabled={idx === 0}
                    aria-label="Previous slide"
                  >
                    ‹ Prev
                  </Button>
                  <span>
                    <span className="mr-2 font-medium uppercase tracking-wide text-foreground">
                      {slide.type}
                    </span>
                    {idx + 1} / {slides.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
                    disabled={idx === slides.length - 1}
                    aria-label="Next slide"
                  >
                    Next ›
                  </Button>
                </figcaption>
              </figure>

              <Separator />

              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Caption:</span> {result.draft.caption}
                </p>
                {result.draft.hashtags.length > 0 && (
                  <p className="text-primary">
                    {result.draft.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}
                  </p>
                )}
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Raw JSON
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-4 text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
