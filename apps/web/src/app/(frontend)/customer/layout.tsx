import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/actions";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    // Token cookie was present (middleware passed) but the session is invalid
    // or expired. Bounce to sign-in, preserving the original path.
    const h = await headers();
    const path =
      h.get("x-pathname") ?? h.get("x-invoke-path") ?? routes.customer.dashboard();
    redirect(routes.signIn({ next: path }));
  }

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3 font-sans">
        <nav className="flex items-center gap-4">
          <Link href={routes.customer.dashboard()} className="font-semibold text-slate-900">
            SMN
          </Link>
          <Link href={routes.customer.dashboard()} className="text-neutral-700 hover:text-slate-900">
            Dashboard
          </Link>
          <Link href={routes.customer.generate()} className="text-neutral-700 hover:text-slate-900">
            Generate
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-slate-900 hover:bg-neutral-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
