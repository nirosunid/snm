"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import config from "@payload-config";

import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";
import type { Account } from "@/payload-types";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function disconnectAccount({
  accountId,
}: {
  accountId: number;
}): Promise<ActionResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const payload = await getPayload({ config });
  let account: Account;
  try {
    account = (await payload.findByID({
      collection: "accounts",
      id: accountId,
      user,
      overrideAccess: false,
      depth: 0,
    })) as Account;
  } catch {
    return { ok: false, error: "Account not found." };
  }

  await payload.delete({
    collection: "accounts",
    id: accountId,
    user,
    overrideAccess: false,
  });

  const brandId =
    typeof account.brand === "object" && account.brand
      ? (account.brand as { id: number }).id
      : (account.brand as number);
  revalidatePath(routes.customer.brands.detail(brandId));
  return { ok: true };
}
