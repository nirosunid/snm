import Link from "next/link";

import { currentUser, isStaff } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function Home() {
  const user = await currentUser();

  return (
    <main
      style={{
        fontFamily: "system-ui",
        padding: "4rem 1.5rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>SMN</h1>
      <p style={{ marginBottom: "1.5rem", color: "#444" }}>
        On-brand carousel posts drafted by AI, approved by you.
      </p>

      <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {user ? (
          <>
            <Link
              href={routes.customer.dashboard()}
              style={{
                padding: "0.6rem 1rem",
                background: "#0F172A",
                color: "white",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              Go to your dashboard
            </Link>
            {isStaff(user) && (
              <Link
                href={routes.admin()}
                style={{
                  padding: "0.6rem 1rem",
                  background: "white",
                  color: "#0F172A",
                  border: "1px solid #E5E5E5",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                Payload admin
              </Link>
            )}
          </>
        ) : (
          <>
            <Link
              href={routes.signUp()}
              style={{
                padding: "0.6rem 1rem",
                background: "#0F172A",
                color: "white",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              Get started
            </Link>
            <Link
              href={routes.signIn()}
              style={{
                padding: "0.6rem 1rem",
                background: "white",
                color: "#0F172A",
                border: "1px solid #E5E5E5",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </>
        )}
      </nav>

      <footer
        style={{
          marginTop: "4rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid #E5E5E5",
          color: "#777",
          fontSize: "0.85rem",
        }}
      >
        <Link
          href={routes.privacy()}
          style={{ color: "#777", marginRight: "1rem" }}
        >
          Privacy
        </Link>
        <Link href={routes.terms()} style={{ color: "#777" }}>
          Terms
        </Link>
      </footer>
    </main>
  );
}
