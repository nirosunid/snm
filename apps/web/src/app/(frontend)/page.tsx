import Link from "next/link";

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "4rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>SMN</h1>
      <p style={{ marginBottom: "0.5rem" }}>Social Media Manager — scaffolding live.</p>
      <p style={{ color: "#666" }}>
        <Link href="/admin">Open the Payload admin →</Link>
      </p>
    </main>
  );
}
