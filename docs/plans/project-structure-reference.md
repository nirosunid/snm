# `apps/web` Project-Structure Reference

A portable map of how the SMN web app is structured — **routes, components, hooks, styles**, and **how customer features and design are handled** — written so the patterns can be reused as inspiration in another project.

All paths are relative to `apps/web/`. **PayloadCMS collection-schema internals are intentionally out of scope**; the access-control pattern is covered at a high level because it is how customer features are gated. Integration internals (`agents/`, `instagram/`, `billing/`) are summarized, not exhaustively documented.

---

## 1. Stack snapshot

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, RSC) + Payload CMS 3.x, TypeScript |
| Styling | Tailwind **v4 — CSS-first, no `tailwind.config`** (config lives in `globals.css`) |
| Component kit | shadcn/ui (`new-york` style, base color `slate`), Radix primitives |
| Variants | `class-variance-authority` (`cva`) + `cn()` (`clsx` + `tailwind-merge`) |
| Theming | `next-themes` (class strategy), tokens in **oklch** |
| Icons | `lucide-react` |
| Validation | `zod` (schema + `z.infer` type co-located per feature) |
| Mutations | React Server Actions → Payload Local API |
| Slide rendering | Satori via `next/og` (`ImageResponse`) |

**Path aliases** (`components.json` + tsconfig): `@/*` → `src/*`, `@/components/ui`, `@/components/customer`, `@/lib`, `@/hooks`, `@/lib/utils`.

---

## 2. Route architecture

### Route-group strategy (`src/app/`)
Three route groups isolate layouts **without adding URL segments**:

| Group | Owns | URLs |
|---|---|---|
| `(frontend)` | Customer surface, marketing, all app APIs | `/`, `/customer/*`, `/api/*` (non-Payload) |
| `(payload)` | Payload-owned admin + API | `/admin/*`, `/api/[...slug]`, `/api/graphql`, `/api/graphql-playground` |
| `(legal)` | Standalone legal layout | `/privacy`, `/terms` |

```
src/app/
├── (frontend)/
│   ├── layout.tsx            # root <html>, ThemeProvider, globals.css
│   ├── page.tsx              # / marketing home
│   ├── sign-in/ · sign-up/   # public auth
│   ├── customer/             # auth-gated app (see below)
│   ├── dev/                  # staff-only tools (templates, feedback)
│   └── api/                  # app APIs (see below)
├── (payload)/                # admin + REST + GraphQL (Payload-generated)
└── (legal)/                  # /privacy, /terms
```

### Customer pages — `app/(frontend)/customer/...`
| File | URL | Purpose |
|---|---|---|
| `customer/layout.tsx` | — | Auth gate (server-side `currentUser()`) + app shell (header + sidebar) |
| `dashboard/page.tsx` | `/customer/dashboard` | Hub: subscription status, brand count, quick-starts |
| `generate/page.tsx` | `/customer/generate` | Carousel generation playground |
| `brands/page.tsx` | `/customer/brands` | Brand list |
| `brands/new/page.tsx` | `/customer/brands/new` | Brand-creation wizard |
| `brands/[brandId]/page.tsx` | `/customer/brands/:id` | Brand detail (brief, palette, voice, accounts) |
| `brands/[brandId]/library/page.tsx` | `…/library` | Asset library (`?q=` search) |
| `brands/[brandId]/queue/page.tsx` | `…/queue` | Content-job queue |
| `brands/[brandId]/queue/[jobId]/page.tsx` | `…/queue/:jobId` | Job editor (review → edit → approve → publish) |

**Public / auth / legal:** `/`, `/sign-in`, `/sign-up`, `/privacy`, `/terms`.
**Staff-only:** `/dev/templates` (slide-template gallery), `/dev/feedback` (ratings dashboard) — both gated with `isStaff(user)` → `notFound()`.

### API routes — `app/(frontend)/api/...`
All declare `export const runtime = "nodejs"` (Payload Local API + sockets need Node); the **`render` route is the exception** — it uses `next/og` on the Edge runtime.

| Route | URL | Method | Auth |
|---|---|---|---|
| `customer/generate/route.ts` | `/api/customer/generate` | POST | session (`currentUser`) + paywall |
| `customer/render/route.tsx` | `/api/customer/render` | GET | session; returns PNG via `ImageResponse` |
| `customer/voice-samples/route.ts` | `/api/customer/voice-samples` | POST | session |
| `oauth/instagram/start/route.ts` | `/api/oauth/instagram/start` | GET | session + brand ownership; sets signed CSRF state cookie |
| `oauth/instagram/callback/route.ts` | `/api/oauth/instagram/callback` | GET | verifies state; token exchange; upserts account |
| `stripe/webhook/route.ts` | `/api/stripe/webhook` | POST | Stripe signature |
| `meta/data-deletion/route.ts` | `/api/meta/data-deletion` | POST | Meta signed request |
| `data-deletion/route.ts` | `/api/data-deletion` | POST | session + email confirmation |
| `admin/refresh-instagram-tokens/route.ts` | `/api/admin/refresh-instagram-tokens` | POST | staff or cron secret (`ops/auth`) |
| `dev/llm-debug` · `dev/tool-roundtrip` | `/api/dev/*` | POST | staff only |
| `health/route.ts` | `/api/health` | GET | public; DB round-trip probe |

### Centralized routing — `src/lib/routes.ts`
**Rule: never hand-write a URL string.** Every `Link`, `redirect`, `fetch`, and middleware matcher goes through typed builder functions; query strings are encoded centrally via `withQuery()`.

```ts
export const routes = {
  home: () => "/",
  signIn: (params?: { next?: string }) => withQuery("/sign-in", { next: params?.next }),
  customer: {
    dashboard: () => `${CUSTOMER_PREFIX}/dashboard`,
    brands: {
      detail:   (brandId) => `${CUSTOMER_PREFIX}/brands/${encodeURIComponent(String(brandId))}`,
      queueJob: (brandId, jobId) => `${CUSTOMER_PREFIX}/brands/${…}/queue/${…}`,
    },
    matches: (path) => path === CUSTOMER_PREFIX || path.startsWith(`${CUSTOMER_PREFIX}/`),
  },
  api: { customer: { render: (params) => withQuery("/api/customer/render", params) } },
};
```

### Auth gating — three layers
1. **`src/middleware.ts`** — fast cookie check (`payload-token`) on matcher `/customer/:path*`; missing → redirect `routes.signIn({ next })`.
2. **`app/(frontend)/customer/layout.tsx`** — authoritative server-side `currentUser()` revalidation (cookie presence ≠ valid session).
3. **Per-page** — `isStaff(user)` gates for `/dev/*`; pages re-fetch the typed user.

**Dynamic-segment pattern** (App-Router 15): `params: Promise<{ brandId: string }>` → `Number()` coercion + `notFound()` on invalid → ownership re-check via `payload.findByID({ id, user, overrideAccess: false })` → cross-resource check (e.g. `job.brand.id === brand.id`).

---

## 3. Component system

### `src/components/ui/` — shadcn primitives (~46)
Generated/owned design-system primitives. Grouped:

- **Inputs/controls:** `button`, `input`, `textarea`, `checkbox`, `radio-group`, `select`, `switch`, `label`, `input-otp`, `toggle`, `toggle-group`, `slider`, `form` (react-hook-form context).
- **Layout/containers:** `card`, `sidebar`, `separator`, `aspect-ratio`, `resizable`, `scroll-area`, `tabs`, `collapsible`.
- **Overlays:** `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `hover-card`, `tooltip`, `context-menu`.
- **Navigation/menus:** `dropdown-menu`, `menubar`, `navigation-menu`, `command` (cmdk), `breadcrumb`, `pagination`.
- **Feedback/data:** `alert`, `badge`, `skeleton`, `progress`, `avatar`, `carousel` (embla), `chart` (recharts), `table`, `calendar`, `sonner` (toaster).

**Shared anatomy** (every primitive): `cva` variants + `cn()` merge + Radix primitive + `data-slot` attributes + a uniform focus ring (`focus-visible:ring-[3px] ring-ring/50`) and `aria-invalid:*` error styling. Canonical example:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium … focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive",
  {
    variants: {
      variant: { default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
                 destructive: "…", outline: "…", secondary: "…", ghost: "…", link: "…" },
      size:    { default: "h-9 px-4 py-2", sm: "h-8 px-3", lg: "h-10 px-6", icon: "size-9" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

### `src/components/customer/` — feature components (12)
| Component | Role |
|---|---|
| `brand-wizard.tsx` | 4-step create flow (Identity → Voice → Look → Review); controlled state + `useTransition` |
| `brand-header.tsx` | Fixed top bar (logo, sidebar toggle, user menu, sign-out) |
| `brand-sidebar.tsx` | Collapsible nav (Dashboard / Brands / Generate), active-link by pathname |
| `asset-uploader.tsx` | Drag-drop image upload with per-file status queue |
| `voice-samples-form.tsx` | Paste past posts → embed; sample-count preview |
| `job-editor.tsx` | Review/edit AI draft slides, approve/discard/publish, IG account picker |
| `generate-playground.tsx` | Topic + brand + promo → live slide preview; paywall banner |
| `subscription-card.tsx` | Stripe status badge + Subscribe / Manage CTAs (bypass-aware) |
| `feedback-card.tsx` | 1–5★ interactive rating + notes |
| `delete-account-card.tsx` | Danger zone; AlertDialog with email confirmation |
| `disconnect-account-button.tsx` | Drop a connected IG account |
| `logo.tsx` | Inline SVG wordmark/mark |

`src/components/theme-provider.tsx` — thin `next-themes` wrapper.

**App shell:** fixed header (`h-16`, `z-50`) + collapsible sidebar (`ui/sidebar`'s `useSidebar`, keyboard shortcut, cookie-persisted open/collapsed state) + `mt-16` main content. Mobile collapses the sidebar into a `Sheet`.

---

## 4. Hooks

`src/hooks/use-mobile.ts` — `useIsMobile()`: matches `(max-width: 767px)`, SSR-safe (returns a stable boolean after hydration). **The only bespoke hook.** The codebase deliberately leans on built-ins (`useTransition`, `useActionState`, `useState`) and Radix's internal hooks rather than a custom hook layer — worth replicating: don't manufacture hooks you don't need.

---

## 5. Styling & design system

### Tailwind v4, CSS-first
- `postcss.config.mjs` loads only `@tailwindcss/postcss`. **No `tailwind.config.{js,ts}`.**
- `src/app/(frontend)/globals.css` is the single source of truth: imports, custom variant, design tokens, and the `@theme` mapping.

```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(0.97 0.01 80.72);
  --foreground: oklch(0.3 0.04 30.2);
  --primary:    oklch(0.52 0.13 144.17);   /* brand green */
  --destructive:oklch(0.54 0.19 26.72);
  --border: oklch(0.88 0.02 74.64);
  --ring:   oklch(0.52 0.13 144.17);
  --radius: 0.5rem;
  /* full families: card/popover/secondary/muted/accent, --chart-1..5, --sidebar-* */
}
.dark { /* same tokens, re-tuned oklch lightness */ }

@theme inline {                     /* expose tokens as Tailwind utilities */
  --color-primary: var(--primary);
  --font-sans: var(--font-sans);
  --radius-sm: calc(var(--radius) - 4px);  /* …md/lg/xl */
}
@layer base { /* global border-color reset */ }
```

- **Dark mode:** class strategy via `next-themes` in the root layout — `attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`.
- **Color space:** everything is **oklch** (perceptually-uniform light/dark tuning), with dedicated `--chart-*` and `--sidebar-*` token families.
- **`cn()`** (`src/lib/utils.ts`): `twMerge(clsx(inputs))` — used by every component.
- **`components.json`:** `style: new-york`, `baseColor: slate`, `cssVariables: true`, `rsc: true`, aliases as in §1.

> **⚠️ Fonts gotcha (carry this knowledge over):** `--font-sans/serif/mono` are *referenced* in `@theme` but **never actually loaded** — there is no `next/font` import and no `@font-face`. Type currently falls back to browser defaults. A consuming project should wire `next/font` and assign these CSS variables on `<body>`.

### Slide rendering (the "design output")
`src/render/templates/` holds the Satori/`next/og` carousel-slide templates rendered to PNG by `api/customer/render`:
`hook-a`, `listicle-a`, `quote-a`, `cta-a`, `image-caption-a`, plus `_shared.tsx` (size/defaults), `index.ts` (registry), `types.ts`, `seed.ts`; `src/render/fixtures.ts` provides demo brands. Previewed at `/dev/templates`.

> **⚠️ Satori CSS is restricted:** only `display: flex | block | none`; every multi-child element needs `display: flex`; `inline-block` is rejected. Templates are written to that constraint.

---

## 6. How customer features are handled (the core reusable pattern)

### The server-action contract
Every customer mutation follows the same shape — this is the most valuable thing to copy:

```ts
"use server";
export async function createBrand(raw: CreateBrandInputType): Promise<CreateBrandResult> {
  const user = await currentUser();                 // 1. auth gate
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = CreateBrandInput.safeParse(raw);   // 2. Zod validation (server-authoritative)
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" ") };

  const payload = await getPayload({ config });      // 3. Payload Local API…
  try {
    const created = await payload.create({
      collection: "brands",
      data: { /* …shaped from parsed.data… */ owner: user.id },
      overrideAccess: false,                         //    …WITH access control on…
      user,                                          //    …and the acting user
    });
    return { ok: true, brandId: created.id };        // 4. discriminated result
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create brand." };
  }
}
```

Key conventions:
- **Discriminated result** `{ ok: true, … } | { ok: false, error: string }` — never throw to the client; the component renders `error` in an `Alert`.
- **`overrideAccess: false` + `user`** on every customer-owned write/read so Payload access rules apply (the boundary that enforces ownership). `overrideAccess: true` is reserved for access-agnostic storage (e.g. the generic `media` upload), with ownership enforced on the *referencing* collection.
- **`revalidatePath(routes.…)`** after a mutation; redirect via `routes`.
- **Client side**: `useTransition` for pending state (`pending ? "Creating…" : "Create"`), errors surfaced in `Alert variant="destructive"`.

### Canonical end-to-end trace — brand creation
`brand-wizard.tsx` (4-step controlled form, `useTransition`) → on submit calls `createBrand(form)` → **two-phase**: create the brand row first, then (if a logo was chosen) `setBrandLogo(FormData)` uploads to `media` (`overrideAccess: true`) and links it to the brand (`overrideAccess: false, user`) → navigate to `routes.customer.brands.detail(id)`. A logo failure is non-fatal: the brand survives and the user still lands on the detail page.

### Validation sharing (client ↔ server)
Schema and its inferred type are co-located in `src/lib/<feature>/schemas.ts` and imported by both sides:

```ts
export const CreateBrandInput = z.object({
  name: z.string().trim().min(1, "Name is required"),
  dos: StringList, donts: StringList, vocabulary: StringList,
  palette: z.object({ primary: HexOrEmpty.optional(), /* … */ }).optional(),
  font: z.enum(FONT_OPTIONS).default("Inter"),
});
export type CreateBrandInputType = z.infer<typeof CreateBrandInput>;  // client form-state type
```

### `src/lib/` map
| Module | Purpose |
|---|---|
| `auth/` | `session.ts` (`currentUser()`, re-exports `isStaff`), `actions.ts` (signUp/in/out + cookie), `AuthForm.tsx` |
| `brands/` | `actions.ts` (createBrand, setBrandLogo), `schemas.ts` |
| `assets/` | `actions.ts` (upload), `search.ts` (token/OR scoring) |
| `voice/` | `ingest.ts` / `retrieval.ts` (embed + pgvector top-K), `actions.ts`, `schemas.ts` |
| `jobs/` | `actions.ts` (saveDraftEdits / approve / publish / discard) |
| `feedback/` | `actions.ts` (1-per-(user,job) upsert) |
| `accounts/` · `account/` | disconnect IG account · user-account cascade delete (`delete.ts`) |
| `routes.ts` · `utils.ts` | typed URL registry · `cn()` |
| `crypto/tokens.ts` | AES-256-GCM encrypt/decrypt for OAuth tokens at rest |
| `ops/auth.ts` | dual-path authorize: cron shared-secret **xor** staff session |
| `billing/` | *summarized* — Stripe client, `paywall.ts`, checkout/portal, webhook `sync.ts` |
| `instagram/` | *summarized* — `oauth`, `publish` (3-step carousel), `refresh`, `state`, `signed-request` |
| `agents/` | *summarized* — AI pipeline: `pipeline`, `planner`, `writer`, `reviewer`, `llm`, `client`, `embed`, `cost`, `cta`, `brand`, `schemas`, plus `tools/` (`asset-library`, `brand-voice` — LLM tool definitions) |

### Access control (high level — the boundary of this doc)
`src/access/` holds composable Payload `Access` functions returning `boolean` or a `where`-filter:
`isStaff`, `adminOnly`, `adminOrSelf` (`admin.ts`); `customerOnly`, `customerOwner`, `adminOrCustomerOwner` (`customer.ts`); role helpers in `utilities.ts`; `public.ts`, `system.ts`, `index.ts`. Roles: **`system | admin | customer`**. Customer scoping is enforced by (a) passing `user` + `overrideAccess: false`, and (b) an `owner` relationship field whose *create-access strips client-supplied values* so the server stamps the real owner. Collection-field internals beyond this are deliberately not documented here.

---

## 7. Portability checklist — "if you copy this"

- **Route groups** to isolate layouts without URL segments; `/customer` prefix for the gated surface.
- **Typed `routes.ts`** as the only place URLs are built (`withQuery`, `matches` predicate).
- **Three-layer auth**: middleware cookie fast-path → layout session revalidation → per-page role gate.
- **Server-action contract**: `currentUser` gate → Zod `safeParse` → Payload `overrideAccess:false, user` → discriminated `{ ok, … }` → `revalidatePath`. No throwing to the client.
- **Co-located Zod schema + `z.infer` type** shared by client form-state and server validation.
- **Access primitives** as composable `where`-filter functions keyed off an `owner` field.
- **shadcn `new-york` + Tailwind v4 oklch tokens** in a single `globals.css`; `cn()` everywhere; `cva` for variants.
- **Watch-outs to inherit:** wire `next/font` (the `--font-*` vars are unbound here); keep Satori templates flex-only.

---

## Source-of-truth files
- **Routing:** `src/lib/routes.ts`, `src/middleware.ts`, `app/(frontend)/customer/layout.tsx`
- **Components/styles:** `src/components/ui/button.tsx`, `src/components/customer/brand-wizard.tsx`, `src/components/customer/brand-sidebar.tsx`, `src/components/theme-provider.tsx`, `src/app/(frontend)/globals.css`, `components.json`, `postcss.config.mjs`
- **Features/data-flow:** `src/lib/brands/{actions.ts,schemas.ts}`, `src/lib/auth/session.ts`, `src/lib/utils.ts`, `src/access/*`, `src/render/templates/*`
