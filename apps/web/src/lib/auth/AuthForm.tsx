"use client";

import Link from "next/link";
import { useActionState } from "react";

import { routes } from "@/lib/routes";

import type { AuthState } from "./actions";

type Variant = "sign-in" | "sign-up";

type Props = {
  variant: Variant;
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  next?: string;
};

const COPY: Record<
  Variant,
  { title: string; submit: string; submitting: string; switchPrompt: string; switchHref: string; switchLabel: string; minHint?: string }
> = {
  "sign-up": {
    title: "Create your account",
    submit: "Sign up",
    submitting: "Creating account…",
    switchPrompt: "Already have an account?",
    switchHref: routes.signIn(),
    switchLabel: "Sign in",
    minHint: "8+ characters",
  },
  "sign-in": {
    title: "Sign in",
    submit: "Sign in",
    submitting: "Signing in…",
    switchPrompt: "New here?",
    switchHref: routes.signUp(),
    switchLabel: "Create an account",
  },
};

export function AuthForm({ variant, action, next }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {
    error: null,
  });
  const copy = COPY[variant];

  return (
    <main
      style={{
        fontFamily: "system-ui",
        padding: "4rem 1.5rem",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>{copy.title}</h1>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {next && <input type="hidden" name="next" value={next} />}

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontWeight: 500 }}>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            style={{
              padding: "0.6rem 0.75rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontWeight: 500 }}>
            Password
            {copy.minHint && (
              <span style={{ color: "#888", fontWeight: 400, marginLeft: 8, fontSize: "0.85em" }}>
                {copy.minHint}
              </span>
            )}
          </span>
          <input
            type="password"
            name="password"
            autoComplete={variant === "sign-up" ? "new-password" : "current-password"}
            required
            minLength={variant === "sign-up" ? 8 : undefined}
            style={{
              padding: "0.6rem 0.75rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          style={{
            marginTop: "0.5rem",
            padding: "0.7rem 1rem",
            fontSize: "1rem",
            background: pending ? "#888" : "#0F172A",
            color: "white",
            border: 0,
            borderRadius: 6,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? copy.submitting : copy.submit}
        </button>

        {state.error && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: "0.6rem 0.75rem",
              background: "#FEF2F2",
              color: "#7F1D1D",
              border: "1px solid #FCA5A5",
              borderRadius: 6,
              fontSize: "0.9rem",
            }}
          >
            {state.error}
          </p>
        )}
      </form>

      <p style={{ marginTop: "1.5rem", fontSize: "0.9rem", color: "#666" }}>
        {copy.switchPrompt}{" "}
        <Link href={copy.switchHref} style={{ color: "#0F172A" }}>
          {copy.switchLabel}
        </Link>
      </p>
    </main>
  );
}
