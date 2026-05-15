import Link from "next/link";

import { routes } from "@/lib/routes";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12 text-sm leading-relaxed">
      <header className="border-b pb-4">
        <Link
          href={routes.home()}
          className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          ← SMN
        </Link>
      </header>
      <main className="prose prose-sm max-w-none dark:prose-invert">
        {children}
      </main>
      <footer className="border-t pt-4 text-xs text-muted-foreground">
        <Link href={routes.privacy()} className="mr-4 hover:underline">
          Privacy
        </Link>
        <Link href={routes.terms()} className="hover:underline">
          Terms
        </Link>
      </footer>
    </div>
  );
}
