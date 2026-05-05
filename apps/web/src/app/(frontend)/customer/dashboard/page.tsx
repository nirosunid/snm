import Link from "next/link";

import { currentUser, isStaff } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function DashboardPage() {
  // Layout already enforces auth, so user is guaranteed non-null here — but
  // call again for the typed shape (and so this page works if the layout
  // contract ever changes).
  const user = await currentUser();
  if (!user) return null;

  return (
    <main className="mx-auto max-w-[720px] px-6 py-12 font-sans">
      <h1 className="mb-1 text-3xl font-semibold">
        Welcome{user.email ? `, ${user.email.split("@")[0]}` : ""}
      </h1>
      <p className="mt-0 mb-8 text-neutral-500">
        {isStaff(user)
          ? `Signed in as ${user.role}.`
          : "You're all set up. Here's what's next."}
      </p>

      <section className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8">
        <h2 className="mt-0 mb-2 text-lg font-semibold">
          You don&apos;t have any brands yet
        </h2>
        <p className="mt-0 mb-5 text-neutral-600">
          Brands hold the voice, palette, and assets your AI agents draft against.
          You can spin up a draft right now using the playground brief while we
          build out brand creation.
        </p>
        <Link
          href={routes.customer.generate()}
          className="inline-block rounded-md bg-slate-900 px-4 py-2.5 text-white no-underline hover:bg-slate-800"
        >
          Open the generate playground →
        </Link>
      </section>

      {isStaff(user) && (
        <p className="mt-8 text-sm text-neutral-500">
          Operational tools live in the{" "}
          <Link href={routes.admin()} className="text-slate-900 underline">
            Payload admin
          </Link>
          .
        </p>
      )}
    </main>
  );
}
