"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

import { deleteAccountCascade, type DeletionSummary } from "./delete";

export type DeleteAccountResult =
  | { ok: true; summary: DeletionSummary }
  | { ok: false; error: string };

/**
 * Authenticated user-initiated account deletion. Requires the caller to type
 * their own email as a confirmation — defends against accidental clicks and
 * makes the action's irreversibility unambiguous.
 *
 * On success: clears the auth cookie and returns the summary so the UI can
 * redirect with a friendly message. The user record is gone by the time the
 * function returns; subsequent currentUser() calls will return null.
 */
export async function deleteMyAccount({
  confirmEmail,
}: {
  confirmEmail: string;
}): Promise<DeleteAccountResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const expected = (user.email ?? "").trim().toLowerCase();
  const provided = (confirmEmail ?? "").trim().toLowerCase();
  if (!expected || provided !== expected) {
    return {
      ok: false,
      error: "Email confirmation didn't match — type your account email exactly.",
    };
  }

  const summary = await deleteAccountCascade(Number(user.id));

  // Best-effort: clear Payload's auth cookies so the deleted user is signed out
  // immediately. Names match the Payload convention; missing cookies are no-ops.
  const jar = await cookies();
  for (const name of ["payload-token", "smn-payload-token"]) {
    jar.delete(name);
  }

  return { ok: true, summary };
}

/** Server-action redirect helper used by the post-deletion form action. */
export async function redirectAfterDeletion(): Promise<void> {
  redirect(`${routes.signIn()}?deleted=1`);
}
