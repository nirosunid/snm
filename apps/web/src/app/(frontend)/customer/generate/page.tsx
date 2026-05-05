"use client";

import { useState } from "react";

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
    <main className="mx-auto max-w-[880px] px-8 py-12 font-sans">
      <header className="mb-6">
        <h1 className="mb-1 text-3xl font-semibold">Generate playground</h1>
        <p className="m-0 text-neutral-500">
          Issue #2 tracer bullet — hardcoded brand brief, single LLM call,
          structured carousel draft. Real auth lands in Issue #3.
        </p>
      </header>

      <label className="mb-2 block font-medium">
        Topic
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2.5 text-base"
        />
      </label>

      <button
        onClick={onGenerate}
        disabled={loading || topic.trim().length < 3}
        className={
          "mt-3 rounded-md border-0 px-5 py-2.5 text-base text-white " +
          (loading ? "cursor-wait bg-neutral-500" : "cursor-pointer bg-slate-900 hover:bg-slate-800") +
          " disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {loading ? "Generating…" : "Generate"}
      </button>

      {error && (
        <pre className="mt-6 overflow-hidden rounded-md border border-red-300 bg-red-50 p-4 break-words whitespace-pre-wrap text-red-900">
          {error}
        </pre>
      )}

      {result && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">
            Draft for {result.brand} · {result.provider}/{result.model}
          </h2>
          {(() => {
            const slides = result.draft.slides;
            const idx = Math.min(slideIdx, slides.length - 1);
            const slide = slides[idx];
            const src = routes.api.customer.render({ type: slide.type, copy: slide.copy });
            const navBtn = (
              direction: "prev" | "next",
              disabled: boolean,
              onClick: () => void,
            ) => (
              <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
                className={
                  "flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-xl " +
                  (disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-neutral-50")
                }
              >
                {direction === "prev" ? "‹" : "›"}
              </button>
            );
            return (
              <div className="mt-4 mb-6">
                <figure className="m-0 mx-auto max-w-[480px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${slide.type} slide`}
                    className="block aspect-square h-auto w-full rounded-lg border border-neutral-200 bg-neutral-50 object-contain"
                  />
                  <figcaption className="mt-2 flex items-center justify-between text-sm text-neutral-700">
                    {navBtn("prev", idx === 0, () =>
                      setSlideIdx((i) => Math.max(0, i - 1)),
                    )}
                    <span>
                      <strong className="mr-2 uppercase">{slide.type}</strong>
                      <span className="text-neutral-400">
                        {idx + 1} / {slides.length}
                      </span>
                    </span>
                    {navBtn("next", idx === slides.length - 1, () =>
                      setSlideIdx((i) => Math.min(slides.length - 1, i + 1)),
                    )}
                  </figcaption>
                </figure>
              </div>
            );
          })()}
          <p className="mt-4">
            <strong>Caption:</strong> {result.draft.caption}
          </p>
          {result.draft.hashtags.length > 0 && (
            <p className="text-sky-500">
              {result.draft.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}
            </p>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-neutral-500">Raw JSON</summary>
            <pre className="overflow-x-auto rounded-md bg-neutral-100 p-4">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
}
