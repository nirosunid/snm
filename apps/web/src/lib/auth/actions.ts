"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import { routes } from "@/lib/routes";

const AUTH_COOKIE = "payload-token";
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthState = { error: string | null };

async function setAuthCookie(token: string, exp: number | undefined) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: exp ? new Date(exp * 1000) : undefined,
  });
}

function readCredentials(formData: FormData): { email: string; password: string; error?: string } {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { email, password, error: "Enter a valid email address." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      email,
      password,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  return { email, password };
}

function safeNextPath(formData: FormData, fallback = routes.customer.dashboard()): string {
  const next = String(formData.get("next") ?? "").trim();
  // Only allow same-origin paths under the customer surface to prevent open redirects.
  return routes.customer.matches(next) ? next : fallback;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, error } = readCredentials(formData);
  if (error) return { error };

  const payload = await getPayload({ config });
  try {
    // overrideAccess:false enforces the role field's create access (admin/system only),
    // so even though we pass role:'customer' here, an unauthenticated request has the
    // field stripped server-side and the field's defaultValue 'customer' is what lands.
    // We pass it explicitly so the call satisfies the typed required-fields contract.
    await payload.create({
      collection: "users",
      data: { email, password, role: "customer" },
      overrideAccess: false,
    });
    const result = await payload.login({
      collection: "users",
      data: { email, password },
    });
    if (!result.token) return { error: "Sign up succeeded but the session could not be started." };
    await setAuthCookie(result.token, result.exp);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sign up failed.";
    // Surface duplicate-email cleanly.
    if (/duplicate|unique/i.test(message)) {
      return { error: "That email is already registered. Try signing in instead." };
    }
    return { error: message };
  }

  redirect(safeNextPath(formData));
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, error } = readCredentials(formData);
  if (error) return { error };

  const payload = await getPayload({ config });
  try {
    const result = await payload.login({
      collection: "users",
      data: { email, password },
    });
    if (!result.token) return { error: "Invalid email or password." };
    await setAuthCookie(result.token, result.exp);
  } catch {
    // Payload throws on bad creds — keep the message generic.
    return { error: "Invalid email or password." };
  }

  redirect(safeNextPath(formData));
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect(routes.home());
}
