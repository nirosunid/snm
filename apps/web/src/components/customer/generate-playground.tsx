"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { GenerateResponse } from "@/lib/agents/schemas";
import { routes } from "@/lib/routes";

export type BrandOption = {
  id: number;
  name: string;
};

export function GeneratePlayground({ brands }: { brands: BrandOption[] }) {
  const [topic, setTopic] = useState(
    "3 design details that define a Mercedes-Benz interior",
  );
  const [brandValue, setBrandValue] = useState<string>(
    brands.length > 0 ? String(brands[0].id) : "",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);

  if (brands.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Generate playground
          </h1>
          <p className="mt-1 text-muted-foreground">
            Drafts are persisted as content jobs scoped to a brand. Create one
            first.
          </p>
        </div>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>You don&apos;t have a brand yet</CardTitle>
            <CardDescription>
              The pipeline reads a brand brief, voice samples, and asset library
              to plan and write the carousel. Without a brand, there&apos;s
              nothing to write against.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href={routes.customer.brands.new()}>
                <Plus className="size-4" />
                Create brand
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  async function onGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    setSlideIdx(0);
    try {
      const res = await fetch(routes.api.customer.generate(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, brandId: Number(brandValue) }),
      });
      const json = (await res.json()) as GenerateResponse | { error?: string };
      if (!res.ok) {
        const msg =
          typeof (json as { error?: string }).error === "string"
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;
        setError(msg);
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
          Pick a brand, type a topic, and the agent plans + writes a 3-slide
          carousel. Approval-by-default — nothing publishes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brief</CardTitle>
          <CardDescription>
            Each generation persists a content job. View status and history at{" "}
            <Link
              href={routes.customer.brands.detail(Number(brandValue))}
              className="underline-offset-4 hover:underline"
            >
              the brand page
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Select value={brandValue} onValueChange={setBrandValue}>
              <SelectTrigger id="brand">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            disabled={loading || topic.trim().length < 3 || !brandValue}
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

      {result?.status === "failed" && (
        <Alert variant="destructive">
          <AlertTitle>Job #{result.jobId} failed</AlertTitle>
          <AlertDescription className="break-words whitespace-pre-wrap">
            {result.error ?? "Unknown error."}
          </AlertDescription>
        </Alert>
      )}

      {result && result.status === "ready" && result.draft && (() => {
        const draft = result.draft;
        const slides = draft.slides;
        const idx = Math.min(slideIdx, slides.length - 1);
        const slide = slides[idx];
        // Asset slides carry their own URL; templated slides go through the
        // brand-aware Satori renderer.
        const src =
          slide.imageUrl ??
          routes.api.customer.render({
            type: slide.type,
            copy: slide.copy,
            brandId: brandValue,
          });
        const review = result.review;
        const cost =
          result.costCents != null
            ? `$${(result.costCents / 100).toFixed(4)}`
            : "—";
        return (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Draft</CardTitle>
                  <CardDescription>
                    {result.brand} · {result.provider}/{result.model} ·{" "}
                    {result.voiceSamplesUsed} voice sample
                    {result.voiceSamplesUsed === 1 ? "" : "s"} · cost {cost}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary">job #{result.jobId}</Badge>
                  {review && (
                    <Badge
                      variant={review.verdict === "ship" ? "default" : "destructive"}
                    >
                      {review.verdict}
                      {review.revisionsRun > 0
                        ? ` (after ${review.revisionsRun} revision)`
                        : ""}
                    </Badge>
                  )}
                </div>
              </div>
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
                  <span className="font-medium">Caption:</span> {draft.caption}
                </p>
                {draft.hashtags.length > 0 && (
                  <p className="text-primary">
                    {draft.hashtags
                      .map((t) => `#${t.replace(/^#/, "")}`)
                      .join(" ")}
                  </p>
                )}
              </div>

              {review && review.issues.length > 0 && (
                <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium text-amber-600">
                    Reviewer flagged {review.issues.length} issue
                    {review.issues.length === 1 ? "" : "s"}
                    {review.revisionsRun > 0
                      ? " — these remain after the revision pass."
                      : "."}
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {review.issues.map((iss, i) => (
                      <li key={i}>
                        <span className="font-mono text-xs uppercase">
                          {iss.kind}
                        </span>
                        {iss.slideIndex >= 0
                          ? ` • slide ${iss.slideIndex + 1}`
                          : " • carousel"}
                        : {iss.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Raw JSON
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-4 text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </CardContent>
            <CardFooter>
              <Button asChild>
                <Link
                  href={routes.customer.brands.queueJob(
                    Number(brandValue),
                    result.jobId,
                  )}
                >
                  Open in queue
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        );
      })()}
    </div>
  );
}
