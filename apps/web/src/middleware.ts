import { NextResponse, type NextRequest } from "next/server";

import { routes } from "@/lib/routes";

// Fast-path gate for the customer surface. Only checks cookie presence —
// the actual session validation happens server-side via Payload's auth in
// the customer layout (defense in depth). The middleware exists so an
// unauthenticated visitor doesn't pay for a full SSR pass before being
// bounced to /sign-in, and so we can preserve their original path via ?next=.
const AUTH_COOKIE = "payload-token";

export function middleware(req: NextRequest) {
  if (req.cookies.has(AUTH_COOKIE)) return NextResponse.next();

  const signIn = new URL(
    routes.signIn({ next: req.nextUrl.pathname }),
    req.nextUrl.origin,
  );
  return NextResponse.redirect(signIn);
}

// Next.js requires `matcher` to be a literal at build time (statically
// analyzable). It can't read `routes.customer.matcher` because that's a
// property-access expression. Keep this string in sync with `CUSTOMER_PREFIX`
// in `src/lib/routes.ts`.
export const config = {
  matcher: ["/customer/:path*"],
};
