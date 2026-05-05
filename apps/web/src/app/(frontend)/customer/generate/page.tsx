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
    <main
      style={{
        fontFamily: "system-ui",
        padding: "3rem 2rem",
        maxWidth: 880,
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
          Generate playground
        </h1>
        <p style={{ color: "#666", margin: 0 }}>
          Issue #2 tracer bullet — hardcoded brand brief, single LLM call,
          structured carousel draft. Real auth lands in Issue #3.
        </p>
      </header>

      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
        Topic
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: "0.25rem",
            padding: "0.6rem 0.75rem",
            fontSize: "1rem",
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />
      </label>

      <button
        onClick={onGenerate}
        disabled={loading || topic.trim().length < 3}
        style={{
          marginTop: "0.75rem",
          padding: "0.6rem 1.25rem",
          fontSize: "1rem",
          background: loading ? "#999" : "#0F172A",
          color: "white",
          border: 0,
          borderRadius: 6,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Generating…" : "Generate"}
      </button>

      {error && (
        <pre
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            background: "#FEF2F2",
            color: "#7F1D1D",
            border: "1px solid #FCA5A5",
            borderRadius: 6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error}
        </pre>
      )}

      {result && (
        <section style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
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
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1px solid #E5E5E5",
                  background: "white",
                  fontSize: "1.25rem",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {direction === "prev" ? "‹" : "›"}
              </button>
            );
            return (
              <div style={{ margin: "1rem 0 1.5rem" }}>
                <figure
                  style={{
                    margin: 0,
                    maxWidth: 480,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${slide.type} slide`}
                    style={{
                      display: "block",
                      width: "100%",
                      height: "auto",
                      aspectRatio: "1 / 1",
                      objectFit: "contain",
                      borderRadius: 8,
                      border: "1px solid #E5E5E5",
                      background: "#FAFAFA",
                    }}
                  />
                  <figcaption
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "0.5rem",
                      fontSize: "0.875rem",
                      color: "#444",
                    }}
                  >
                    {navBtn("prev", idx === 0, () =>
                      setSlideIdx((i) => Math.max(0, i - 1)),
                    )}
                    <span>
                      <strong style={{ textTransform: "uppercase", marginRight: 8 }}>
                        {slide.type}
                      </strong>
                      <span style={{ color: "#888" }}>
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
          <p style={{ marginTop: "1rem" }}>
            <strong>Caption:</strong> {result.draft.caption}
          </p>
          {result.draft.hashtags.length > 0 && (
            <p style={{ color: "#0EA5E9" }}>
              {result.draft.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}
            </p>
          )}
          <details style={{ marginTop: "1rem" }}>
            <summary style={{ cursor: "pointer", color: "#666" }}>Raw JSON</summary>
            <pre style={{ background: "#F5F5F5", padding: "1rem", borderRadius: 6, overflowX: "auto" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </main>
  );
}
