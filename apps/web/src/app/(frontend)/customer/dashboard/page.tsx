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
    <main
      style={{
        fontFamily: "system-ui",
        padding: "3rem 1.5rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
        Welcome{user.email ? `, ${user.email.split("@")[0]}` : ""}
      </h1>
      <p style={{ color: "#666", margin: "0 0 2rem" }}>
        {isStaff(user)
          ? `Signed in as ${user.role}.`
          : "You're all set up. Here's what's next."}
      </p>

      <section
        style={{
          padding: "2rem",
          border: "1px dashed #D4D4D4",
          borderRadius: 12,
          background: "#FAFAFA",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "0.5rem" }}>
          You don&apos;t have any brands yet
        </h2>
        <p style={{ color: "#555", margin: "0 0 1.25rem" }}>
          Brands hold the voice, palette, and assets your AI agents draft against.
          You can spin up a draft right now using the playground brief while we
          build out brand creation.
        </p>
        <Link
          href={routes.customer.generate()}
          style={{
            display: "inline-block",
            padding: "0.6rem 1rem",
            background: "#0F172A",
            color: "white",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Open the generate playground →
        </Link>
      </section>

      {isStaff(user) && (
        <p style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#666" }}>
          Operational tools live in the{" "}
          <Link href={routes.admin()} style={{ color: "#0F172A" }}>
            Payload admin
          </Link>
          .
        </p>
      )}
    </main>
  );
}
