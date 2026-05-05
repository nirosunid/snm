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
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid #E5E5E5",
          fontFamily: "system-ui",
        }}
      >
        <nav style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href={routes.customer.dashboard()} style={{ fontWeight: 600, color: "#0F172A" }}>
            SMN
          </Link>
          <Link href={routes.customer.dashboard()} style={{ color: "#444" }}>
            Dashboard
          </Link>
          <Link href={routes.customer.generate()} style={{ color: "#444" }}>
            Generate
          </Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.9rem" }}>
          <span style={{ color: "#666" }}>{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              style={{
                padding: "0.4rem 0.75rem",
                fontSize: "0.85rem",
                background: "white",
                color: "#0F172A",
                border: "1px solid #E5E5E5",
                borderRadius: 6,
                cursor: "pointer",
              }}
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
