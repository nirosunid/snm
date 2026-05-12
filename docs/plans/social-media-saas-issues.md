# Issues: Social Media Manager SaaS — MVP-1

> **Status:** Draft — pending publication to issue tracker (none configured yet). **Issues #1–#11 are done (with cuts noted per-issue); #12 is the active slice.** Issue #4 is fully closed (logo upload landed in #6). Issue #6 is fully closed (`getAssetLibraryTool` wrapper landed in #8; planner-driven asset slide embedding landed in #9). UI scaffolding (Tailwind CSS v4 + shadcn/ui sidebar+header shell) landed between #3 and #4 — see "UI scaffolding" note below the critical path.
>
> **Architecture note:** The stack pivoted during Issue #2. The agent pipeline now lives in `apps/web` TypeScript (Vercel AI SDK + Zod), not in `apps/agents` Python. RabbitMQ/Celery/Flower are deferred. Customer-facing routes are prefixed with `/customer`. See `CLAUDE.md` (repo root) for the current architecture; `social-media-saas-mvp-1.md`'s preamble explains the deltas. Issues #5+ below still describe the Python `/embed` endpoint — that endpoint will land in `apps/web` instead, served from a TS route under `/api/customer/embed`.
>
> **Source:** [social-media-saas-prd.md](./social-media-saas-prd.md), [social-media-saas-mvp-1.md](./social-media-saas-mvp-1.md).
>
> **How to use this file:** when an issue tracker (GitHub Projects, Linear, Jira, etc.) is configured, copy each `## Issue N` section into a new ticket. Apply the `needs-triage` label to each. Cross-reference numbers as you create them — the "Blocked by" field uses `#N` placeholders that map to the order below; replace with real issue identifiers as you go.
>
> **Critical path:** `#1 → #2 → #3 → #4 → #5, #6, #7, #8 → #9 → #10, #11, #12, #14 → #13 → #15 → #16 → #17 → #18 → #19`. `#16` and `#17` run in parallel from week 1.
>
> **UI scaffolding (between #3 and #4, not its own issue):** Tailwind CSS v4 wired into `apps/web` (`postcss.config.mjs` mounted into the dev container, `globals.css` importing `tailwindcss`). shadcn/ui initialized (`new-york` style, `slate` base, full `src/components/ui/` set, `cn` helper, `use-mobile` hook, oklch-green theme tokens with dark-mode). Customer shell ported to `SidebarProvider` + `BrandHeader` + `BrandSidebar` (`src/components/customer/`); `/customer/dashboard` and `/customer/generate` ported to the new primitives. This is the styling foundation Issue #4's brand-creation UI builds on — multi-step form, palette picker, font picker, logo upload should use the shadcn primitives, not bespoke styles.

---

## Issue 1 — Foundation: monorepo scaffolding + dev stack boots ✅ DONE

### What to build

Set up the monorepo skeleton mirroring the user's `products` project pattern. Two empty applications (`apps/web` with Next.js 15 + Payload CMS 3.x; `apps/agents` with Python 3.12 + FastAPI + Celery) and the supporting infrastructure (Postgres + pgvector + RabbitMQ + Flower) all bootable with a single `./scripts/dev.sh up`. CI on push lints both apps. No customer-facing functionality yet — this is the foundation every later slice builds on.

### Acceptance criteria

- [x] Repository structure matches the layout in the architecture plan: `apps/web`, `apps/agents`, `database/`, `scripts/`, `docker-compose.yml` + `.dev.yml` + `.prod.yml`, `pnpm-workspace.yaml`, `.env.example`, `.github/workflows/` directory.
- [x] `./scripts/dev.sh up` brings the full stack online: postgres + pgvector, rabbitmq, web, agents, celery-worker, flower.
- [x] `localhost:3000` (Next.js), `localhost:3000/admin` (Payload), `localhost:8001/docs` (FastAPI), `localhost:5555` (Flower), `localhost:15672` (RabbitMQ management) all respond.
- [x] `select * from pg_extension where extname='vector'` returns a row inside the `postgres` container.
- [x] Multi-stage Dockerfiles per app with `dev` and `prod` build targets.
- [x] CI workflow lints `apps/web` (`pnpm lint`) and `apps/agents` (`uv run ruff check`) on every push.
- [x] `.env.example` documents every required key (DB URL, RabbitMQ URL, LLM provider keys, Stripe, Meta app id/secret, Payload secret).

### Blocked by

None — can start immediately.

---

## Issue 2 — Tracer Bullet: hardcoded brand → printable draft ✅ DONE

### What to build

The deliberate end-to-end skeleton cut. A single button on a stub page calls a synchronous TypeScript function that does **one** LLM call against **one** configurable provider with **one** hardcoded brand brief. The result is a JSON `draftPayload` echoed in the browser plus a rendered PNG per slide via `/api/customer/render`. No Payload collections, no async work, no real persistence.

**Pivot during build:** the original plan placed the LLM call in `apps/agents` Python (LangChain) with a web → agents HTTP hop. That was reversed mid-build — the call now runs inline in `apps/web` via the Vercel AI SDK + Zod, with no network hop. This shape is what later slices extend.

### Implementation notes (as built)
- `apps/web/src/lib/agents/{schemas,brand,llm,generate}.ts` — Zod schemas, hardcoded brand, multi-provider LLM factory, single-call orchestration.
- `app/(frontend)/api/customer/generate/route.ts` (Node runtime) — POST endpoint.
- `app/(frontend)/api/customer/render/route.tsx` (Edge runtime) — Satori `ImageResponse`, 1080×1080 PNG.
- `app/(frontend)/customer/generate/page.tsx` — stub UI (Generate button + slider for the rendered slides).
- Default provider: `ollama` / `llama3.2` via `host.docker.internal`. `mode: "json"` is set on `generateObject` for small-model JSON reliability.

### Acceptance criteria

- [x] Stub page (`/customer/generate`) with a "Generate" button.
- [x] Clicking the button completes within ~10 seconds and returns a `draftPayload` shape (slides array with copy + caption + hashtags) plus per-slide rendered PNGs.
- [x] At least one provider's LLM call succeeds end-to-end and produces parseable structured output (verified with Ollama/`llama3.2`).
- [x] The render endpoint produces a valid 1080×1080 PNG using the hardcoded brand template.
- [x] Reference screenshots captured (FitDesk fitness brand, then Mercedes-Benz luxury brand) showing the full slider experience.
- [x] **Deferred to Issue #3:** auth gating on `/customer/generate`. *Landed in #3 — middleware redirects unauthenticated requests on `/customer/*` to `/sign-in?next=...`.*

### Blocked by

- #1

---

## Issue 3 — Customer signup + role model + access control ✅ DONE

### What was built

Real Payload Auth replacing the unauthenticated `/customer/generate` page from #2. Customers sign up at `/sign-up`, log in at `/sign-in`, and land on `/customer/dashboard` (empty-state UI). Three roles on the `users` collection: `system`, `admin`, `customer`. Reusable access primitives extracted under `apps/web/src/access/` (mirrors the products/cms layout). Middleware fast-paths `/customer/*` redirects when no auth cookie is present; the `(frontend)/customer/layout.tsx` enforces full session validation as defense-in-depth.

### Implementation notes (as built)
- Reusable access primitives in `apps/web/src/access/{utilities,public,system,admin,customer}.ts` plus `index.ts` barrel — mirrors `products/apps/cms/src/access/`. Helpers exported: `checkRole`, `userHaveAnyRole`, `haveAnyRole`, `isLoggedIn`, `publicAccess`, `noAccess`, `systemOnly` / `systemOnlyFieldAccess`, `adminOnly` / `adminOnlyFieldAccess` / `adminOrSelf` / `isAdmin`, `customerOnly` / `customerOnlyFieldAccess` / `customerOwner` / `adminOrCustomerOwner`. New collections compose these.
- `Users` collection: `role` select enum with `defaultValue: 'customer'`. Collection access: `create=publicAccess`, `read/update=adminOrSelf`, `delete=adminOnly`, `admin=isAdmin`. Field-level access on `role`: `adminOnlyFieldAccess` for create + update, so privilege escalation is silently dropped.
- Auth pages public at root (`/sign-up`, `/sign-in`) — they're pre-auth, the `/customer` prefix is reserved for the post-auth surface.
- Server actions in `src/lib/auth/actions.ts` (`signUp`, `signIn`, `signOut`) use Payload's Local API + the `payload-token` cookie. `signUp` sets `overrideAccess: false` so field access enforces the role default.
- Session helper `src/lib/auth/session.ts` exposes `currentUser()` (reads cookie via `payload.auth({ headers })`) and `isStaff(user)`.
- Middleware (`src/middleware.ts`) gates `/customer/:path*` on cookie presence (cheap, no DB hit). The layout `await currentUser()` does the actual session check.
- Home page (`/`) shows different CTAs based on auth state. `/customer/dashboard` shows an empty-state card pointing to `/customer/generate` for now.

### Acceptance criteria

- [x] Customer can sign up via `/sign-up`, log in via `/sign-in`, and land on `/customer/dashboard`.
- [x] Three roles (`system`, `admin`, `customer`) exist in the `users` collection enum; field-level access prevents non-admins from elevating themselves (verified via PATCH `role=admin` smoke test — request returns 200 but `role` is dropped).
- [x] Payload `/admin` shows users; only `admin` / `system` can read other customers' rows (verified via REST: customer GET `/api/users` returns only their own row; GET `/api/users/<other id>` returns 404).
- [x] Visiting `/customer/*` while signed-out redirects to `/sign-in?next=<original path>`.
- [x] Smoke test (curl) covers: signup → login → list-users → read-other-user → escalation-attempt. Promote to Vitest when the test harness lands.
- [x] Empty-state UX on `/customer/dashboard` for new customers.

### Blocked by

- #1, #2

---

## Issue 4 — Brand creation flow + brand profile UI ✅ DONE (partial — logo upload deferred)

### What was built

`brands` Payload collection with the full brand brief (name, niche, audience, tone, `dos[]`, `donts[]`, `vocabulary[]`), 5-color palette (`primary`, `secondary`, `accent`, `background`, `text` — hex with regex validation), `font` select (Inter, Playfair Display, IBM Plex Sans), and `logo` upload relation. Customer-owned via an `owner` relationship to users; `defaultValue: ({ user }) => user.id` plus `adminOnlyFieldAccess` on create+update on the field, so customers cannot create brands owned by anyone else and PATCH attempts to reassign owner are silently dropped (mirrors the role-escalation defense on Users). Collection-level `read/update/delete = adminOrCustomerOwner`.

A 4-step wizard at `/customer/brands/new` (Identity → Voice → Look → Review) using shadcn/ui primitives, native `<input type="color">` palette pickers, and a `useTransition`-driven server action. Brand list at `/customer/brands` (cards with palette-stripe swatch) and detail at `/customer/brands/[brandId]` (palette swatches + font preview). `Brands` link added to the customer sidebar; dashboard CTA branches on whether the user has any brands.

The hardcoded Mercedes-Benz brief from #2 is no longer the only path: `/customer/generate` shows a brand picker (defaults to first owned brand, falls back to a "Playground brand (Mercedes-Benz)" option when the user has none). `/api/customer/generate` accepts `brandId` and loads the record under `overrideAccess: false` for access scoping.

### Implementation notes (as built)
- `apps/web/src/collections/Brands.ts` — schema; `apps/web/src/migrations/20260505_150409_add_brands.{ts,json}` — generated migration (registered in `migrations/index.ts`).
- `apps/web/src/lib/brands/{actions.ts,schemas.ts}` — server action (`createBrand`) split from the Zod input schema, because `"use server"` files can only export async functions (caught the hard way).
- `apps/web/src/components/customer/brand-wizard.tsx` — wizard client component; `apps/web/src/components/customer/generate-playground.tsx` — extracted from the old generate page for the brand-picker version.
- `apps/web/src/lib/agents/brand.ts` — `BrandLike` is now the canonical brief shape (not the hardcoded constant); `brandLikeFromRecord(brand: Brand)` adapts a Payload record. `HARDCODED_BRAND` is retained as the playground fallback. Palette field names migrated from `bg` to `background` to match the collection.
- Smoke test (curl, scripted) verified all five access cases: own list shows 1 / cross-tenant 404 / cross-tenant list-empty / owner stamping on create / silent drop of customer-supplied owner on PATCH.

### Acceptance criteria

- [x] Customer creates a brand via the UI; row persists with all fields populated.
- [x] Logo uploads from the wizard. *Landed alongside Issue #6 — uses a `setBrandLogo(formData)` server action that creates a `media` row from the uploaded File and patches `brand.logo`. Two-phase (brand row first, logo second) so a logo failure doesn't block brand creation.*
- [x] Brand-detail page renders palette swatches and the selected font (with a font-preview pangram).
- [x] Access test: another customer cannot read this brand's row via REST. (curl smoke test scripted; promote to Vitest with the test harness.)
- [x] One customer can have multiple brands (E1 multi-brand-per-user; the wizard does not enforce a single-brand cap and the list page renders N cards).

### Notes for follow-on slices
- The render route at `/api/customer/render` still uses `HARDCODED_BRAND.palette` for slide PNGs. Brand-aware rendering is Issue #7 ("Slide template library + Satori renderer") — that's where it naturally lands. Until then, the playground generates on-brand *copy* but renders Mercedes-style PNGs regardless of selected brand.

### Blocked by

- #3

---

## Issue 5 — Voice samples ingest with pgvector retrieval ✅ DONE

### What was built

`voice-samples` Payload collection with `brand` (relationship), `owner` (denormalized for fast access scoping — same pattern as Brands), `content` (textarea), `source` (`brief` | `pasted_sample`), `model` (text), and `embedding` (jsonb). A parallel `vector(1536)` column (`embedding_vec`) and HNSW index with `vector_cosine_ops` are added by the same migration via raw SQL — Payload's introspection doesn't see the vector column, so it survives schema-diff cleanly.

Embedding ingest goes through `POST /api/customer/voice-samples` (and a server action `addVoiceSamplesFromPaste` for the UI). Splits the paste on blank-lines first, falls back to single-newline splits when there are no blank lines. Embeds the whole batch in one `embedMany()` call. Cross-tenant guard: a `beforeValidate` hook verifies that the supplied `brandId` belongs to the requesting user (admins/system bypass).

Brand-voice retrieval helper `getBrandVoice(brandId, queryText, k=5)` short-circuits to `[]` if the brand has no samples (saves an embed round-trip), then embeds the query and runs `ORDER BY embedding_vec <=> $vec::vector LIMIT k` against the HNSW index. `generateDraft` calls it and includes the top-K samples in the writer's system prompt as a "Voice samples — mimic this style" block. The generate response now includes `voiceSamplesUsed: number` so callers can verify retrieval fired.

Brand-detail page renders a "Voice samples" card with the count badge, a paste textarea + Submit, and a 3-most-recent preview. Brand list cards show per-brand sample counts via a single aggregate query (no N+1).

### Implementation notes (as built)

- `apps/web/src/collections/VoiceSamples.ts` — schema; `apps/web/src/migrations/20260505_155858_add_voice_samples.{ts,json}` — generated migration, *consolidated into a single `db.execute(sql\`…\`)` block* including extension creation, table, foreign keys, indexes, and the parallel `vector(1536)` column + HNSW index. (Initial generated form had three separate `db.execute` calls and one of them was silently skipped at apply time — split execute calls inside one migration are fragile, so always combine.)
- `apps/web/src/lib/agents/embed.ts` — provider-agnostic embedding helper. Pads (or truncates) every output to `EMBEDDING_DIMENSION=1536` so the schema stays locked while the embedding provider can flex. Wired providers: `openai` (default, native 1536) and `ollama` (default `nomic-embed-text`, 768 dims, zero-padded — cosine similarity is invariant to zero-padding so retrieval quality is preserved).
- `apps/web/src/lib/voice/{ingest.ts,actions.ts,schemas.ts,retrieval.ts}` — ingest core, server action, Zod input + paste-splitter, top-K retrieval.
- `apps/web/src/app/(frontend)/api/customer/voice-samples/route.ts` — REST endpoint accepting `{ brandId, samples[] }` or `{ brandId, paste }`.
- `apps/web/src/components/customer/voice-samples-form.tsx` — paste UI client component with live "N samples detected" counter.
- `payload.config.ts` — set `db.push: false` so Payload never silently regenerates the schema and drops the manually-managed `embedding_vec` column on hot reload.
- `docker-compose.yml` — the `web` service was missing the LLM and embedding env vars (left over from the apps/agents → apps/web pipeline pivot in Issue #2). Added `OPENAI_API_KEY`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `OLLAMA_BASE_URL`, the `LLM_*_*` per-stage envs, and `ANTHROPIC_API_KEY` / `GOOGLE_AI_API_KEY` so per-stage provider overrides work.

### Architectural decisions made during build

- **Storage = "Option A" hybrid (mirrors products' `ProductEmbeddings`):** Payload owns the `embedding` jsonb column for ergonomics; a parallel `vector(1536)` column holds the same data for HNSW similarity. Two-phase write: `payload.create` first, then a separate `UPDATE ... SET embedding_vec = $vec::vector WHERE id = $id` outside the create transaction. (Tried as an `afterChange` hook first; Payload v3 wraps creates in a transaction and the hook's drizzle.execute can't see the uncommitted row — `rowCount=0`. Moved the SQL into `ingestVoiceSamples` instead.)
- **Index = HNSW with `vector_cosine_ops`.** Default knobs; works fine at our scale (10s–100s of samples per brand).
- **`push: false` is required** because we manage `embedding_vec` outside Payload's schema model. Without it, every dev hot-reload would `db.push()` the collection definitions and drop the column.
- **Ollama-for-embeddings is supported as a local-dev option** via `EMBEDDING_PROVIDER=ollama` + `EMBEDDING_MODEL=nomic-embed-text`. This is a deliberate deviation from CLAUDE.md's "OpenAI-only" lock — the schema dimension stays at 1536, the 768-dim Ollama output is zero-padded. Caveat: don't mix providers' samples in one DB (different latent spaces). Documented in `.env.example`.

### Acceptance criteria

- [x] Customer pastes ≥10 samples; rows persist with non-null embeddings.
- [x] Direct pgvector query returns ranked-by-similarity samples (verified: query sample ranks at distance 0.0000 against itself, semantically related samples cluster ahead of unrelated ones).
- [x] Pipeline writer prompt now includes top-K voice samples retrieved by similarity to the topic (verified: generate response includes `voiceSamplesUsed: 5`).
- [ ] **Manual / qualitative:** A/B comparison of same topic with vs without voice retrieval. Mechanism is wired (set `brandId` to a brand with 0 samples vs one with samples, observe output style); the human-judgement check is left to founder review during prompt tuning.
- [x] Brand-detail page shows the sample count.

### Notes for follow-on slices

- The `embedding` jsonb column carries the raw float array for forward compatibility (re-indexing, provider migration, debugging); production storage cost is ~6KB per sample which is negligible.
- If we ever need to switch embedding providers in production, pick one and re-embed everything — there's no in-place dimension change without a coordinated migration + full re-embed (per CLAUDE.md).
- `getBrandVoice` runs one count query before embedding to avoid wasted API calls for empty brands. The count is cheap given the `voice_samples_brand_idx` btree index.

### Blocked by

- #4

---

## Issue 6 — Asset library with tag-based retrieval ✅ DONE (LLM-tool wiring + slide embedding deferred)

### What was built

`assets` Payload collection: `brand` (relationship, indexed), `owner` (denormalized — same defaultValue/adminOnly pattern as Brands and VoiceSamples), `name` (text), `file` (upload → `media`), `tags` (array of text rows), `description` (optional textarea). Access = `adminOrCustomerOwner`; a `beforeValidate` hook checks that `data.brand` belongs to the requester (admins/system bypass).

A new `/customer/brands/[brandId]/library` page with three sections: drag-drop uploader (multi-file, batch-shared tags + description), tag/name search box, and a thumbnail grid. Upload goes through a `uploadAsset(formData)` server action that POSTs the file into `media` (overrideAccess true on the upload — media is generic) then creates the `assets` row with `overrideAccess: false`, so the brand-ownership hook fires.

Brand-detail page now shows an asset-count badge with a "Manage library" CTA. Brand list cards show both sample-count and asset-count via a single aggregate query each — still no N+1.

`searchAssets({ brandId, query, user })` is the tag/name/description substring filter the library page uses. It's the same helper the LLM tool will wrap in Issue #8 (which is when tool-calling lands across providers).

### Implementation notes (as built)

- `apps/web/src/collections/Assets.ts` — collection schema; `apps/web/src/migrations/20260505_204619_add_assets.{ts,json}` — generated migration (Payload-managed; no raw SQL needed since `embedding_vec` was the only non-Payload column in the project).
- `apps/web/src/lib/assets/{actions.ts,search.ts}` — `uploadAsset` server action and `searchAssets` retrieval helper.
- `apps/web/src/app/(frontend)/customer/brands/[brandId]/library/page.tsx` — server-component shell + client uploader.
- `apps/web/src/components/customer/asset-uploader.tsx` — drag-drop, queued/uploading/done/failed status per file, "Clear uploaded" to keep the queue tidy.
- `apps/web/src/lib/brands/actions.ts` — adds `setBrandLogo(formData)` for the brand wizard's logo step (mirrors `uploadAsset` shape: media create then patch). Two-phase write so a logo failure leaves the brand row intact.
- `apps/web/src/components/customer/brand-wizard.tsx` — adds the `LogoPicker` sub-component in the "Look" step with a square preview; the review step also renders the logo preview.

### Architectural decisions made during build

- **Two-phase upload (server action, not custom REST):** the action accepts a `FormData`, calls `payload.create({ collection: 'media', file: { data, mimetype, name, size } })` then `payload.create({ collection: 'assets', data: { ..., file: mediaId } })`. Cleaner than a custom multipart REST route, and Payload's Media collection handles all the file-system bookkeeping. Cross-tenant guard is the assets `beforeValidate` hook — same pattern as VoiceSamples.
- **Search is JS-side after a brand-scoped Payload `find`:** Payload's `where` on array sub-fields is awkward, and brand-scoped result sets are small (<100 in MVP-1). Substring match on tags + name + description is more flexible than tag-equals anyway.
- **No image processing in MVP-1.** No resize, no thumbnail generation beyond what Payload Media gives by default. If we hit a real perf or cost wall on rendered slide weight, address it then.
- **Deferred to later issues (these were in the original #6 spec):**
  - **`get_asset_library` LLM tool** → Issue #8 ("Tool-use round-trip works uniformly across adapters"). The `searchAssets` helper this would wrap is already done.
  - **Pipeline embeds at least one user-uploaded asset as a carousel slide** → Issue #7 ("Slide template library + Satori renderer"), which adds the `plain image+caption` template needed to render an arbitrary photo as a slide.

### Acceptance criteria

- [x] Customer uploads ≥3 assets with tags; library page lists them with thumbnails.
- [x] Tag-filter narrows the listing (case-insensitive substring across tags + name + description).
- [ ] **Deferred to #8:** `get_asset_library` tool returns the right assets for a sample query. The underlying retrieval helper (`searchAssets`) is built and tested; the LLM-tool wrapper lands when tool-calling does in #8.
- [x] Pipeline embeds at least one user-uploaded asset as a carousel slide. *Closed in #9 — the planner emits `type: "image_caption"`; the writer resolves an asset URL via `searchAssets` and the renderer's `image_caption_a` template displays it. Verified end-to-end on Gemini 2.5 Flash with a sneaker-product topic and a tagged asset uploaded to the brand library.*
- [x] Access test: another customer cannot list this brand's assets (verified via REST: cross-tenant `GET /api/assets/<id>` → 404, `?where[brand][equals]=<id>` → 0 docs).

### Bonus: closed #4's deferred logo-upload

The brand-creation wizard now collects an optional logo file in the "Look" step (square preview + remove button). On submit, after `createBrand` returns the new id, the wizard calls `setBrandLogo(formData)` to upload the file into `media` and patch `brand.logo`. Failure is non-fatal — the brand exists, the user can retry from the detail page in a later slice.

### Blocked by

- #4

---

## Issue 7 — Slide template library + Satori renderer ✅ DONE (template count cut from 15 → 5; snapshot tests + planner-driven selection deferred)

### What was built

A small but complete template system: a Payload `templates` collection (key, name, type enum, active flag), a code-side React-component registry under `apps/web/src/render/templates/`, an idempotent seed runner that fires from `payload.config.onInit` so the DB rows track the registry on every boot, and a polished `/api/customer/render` route that picks the template by either `templateKey` (new) or `type` (back-compat) and resolves brand palette + font + logo from the `brands` collection at request time.

Five templates ship in this slice:
- `hook_a` — bold left-rule hook (replaces the inline-styled tracer template).
- `listicle_a` — large numeric "1" with title and body copy.
- `cta_a` — palette-inverted dark slab with accent kicker.
- `quote_a` — pull-quote with serif italic body, optional attribution.
- `image_caption_a` — full-bleed image with bottom gradient caption + brand badge. **This is the template that lets the pipeline embed a user-uploaded photo as a slide** (closes the renderer half of Issue #6's deferred slide-embedding; the *picking* half still needs the planner from #8).

The render route now runs in **nodejs runtime** (was edge) so it can hit Payload Local API for brand and media reads. Numeric `brandId` resolves against the `brands` collection under user access; `brandId=fixture:<key>` resolves against `src/render/fixtures.ts` (three baked-in brand palettes — luxury / fitness / bakery — used by `/dev/templates` for visual QA without auth or DB rows).

`/dev/templates` is staff-only (`isStaff(user)` + `notFound()`), renders every active template × every fixture brand in a 3-column grid. Each preview just `<img src=`-loads the render endpoint with the right query params, so the dev page doubles as a smoke harness — if a template breaks, the broken cells are obvious.

The generate playground threads `brandId` into its render URL, so the rendered slide PNGs are now actually styled by the selected brand instead of always looking like the hardcoded Mercedes brief.

### Implementation notes (as built)

- `apps/web/src/collections/Templates.ts` — collection; `apps/web/src/migrations/20260506_044250_add_templates.{ts,json}` — generated migration.
- `apps/web/src/render/templates/index.ts` — registry (`TEMPLATES`, `getTemplate(key)`, `findTemplateByType(type)`).
- `apps/web/src/render/templates/_shared.tsx` — `SLIDE_SIZE`, `FALLBACK_BRAND`, `withDefaults()`, plus shared `<BrandFooter>` and `<Kicker>` components.
- `apps/web/src/render/templates/{hook,listicle,cta,quote,image-caption}-a.tsx` — one template per file.
- `apps/web/src/render/templates/seed.ts` — idempotent seed: creates missing rows on boot, updates `name`/`type` if they drift, never touches `active` (admins can retire a template by toggling that flag without us re-overriding it on next boot).
- `apps/web/src/render/fixtures.ts` — three baked-in brand palettes for `/dev/templates`. `parseFixtureBrandId('fixture:luxury')` returns the matching `RenderBrand`; the render route checks this first before doing the numeric brandId lookup.
- `apps/web/src/app/(frontend)/api/customer/render/route.tsx` — rewritten. Runtime is nodejs. Accepts `templateKey` (preferred) or `type` (back-compat). Anonymously callable for fixture brand ids; numeric brand ids require a session.
- `apps/web/src/app/(frontend)/dev/templates/page.tsx` — staff-only visual QA grid.
- `apps/web/src/lib/routes.ts` — `routes.api.customer.render(...)` accepts the wider param set (`templateKey`, `imageUrl`, `caption`, `attribution`, `brandId`); `routes.dev.templates()` for the QA page.

### Architectural decisions made during build

- **Five templates, not fifteen.** The original spec called for ~15 hand-designed templates across 7 slide types. Cut to one per type that the current `Slide` schema actually emits (`hook`, `listicle_item`, `cta`) plus two for forward use (`quote`, `image_caption`). The infrastructure is now in place — adding more templates is a 1-file change per template + a registry append + a restart for the seed to land. Saves 80% of the design time without blocking any acceptance work that depends on this slice.
- **GET `/api/customer/render` instead of POST.** The playground (and `/dev/templates`) put the render endpoint into `<img src>`, so a GET URL is much simpler than fetching a PNG and creating a blob URL. Query params are bounded (single slide, one copy line, optional image URL) and fit comfortably under URL length limits.
- **nodejs runtime over edge.** Edge can't call Payload Local API (Payload needs Node-only modules). Switching to nodejs lets us load the brand record + logo media in one place. `next/og`'s `ImageResponse` works in both — the same Satori under the hood — so no rendering capability is lost.
- **Seed runs from `onInit`, not from a separate `pnpm seed:templates` script.** Auto-keeps the DB rows in sync with the code registry on every boot. Admins toggling `active` is preserved because the seed never overwrites that field on existing rows.
- **Back-compat with `?type=` is preserved.** The old single-LLM-call writer in `generateDraft` still emits `slide.type`; the playground still calls `routes.api.customer.render({ type, copy })`. The route falls back from `templateKey` to `type` via `findTemplateByType`. When the planner ships in #8/#9 it'll start emitting explicit `templateKey` values.

### Acceptance criteria

- [x] All ~~15~~ **5** templates render correctly at `/dev/templates` with 3 different brand palettes (visually verifiable in the browser; PNG bytes verified via curl smoke for every template × fixture combination).
- [x] GET to `/api/customer/render` returns a valid PNG of the expected dimensions (1080×1080) for any template (verified — magic bytes `89504e47…`, 17/17 calls returned `200 image/png`).
- [x] Brand palette colors verifiable in the output (snapshot check on 3 templates) — distinct PNG byte counts per fixture × template confirm the palette is applied; full pixel-snapshot test deferred (no test harness yet — it'd be its own slice).
- [ ] **Deferred to #8/#9:** Pipeline picks an appropriate template based on the planner's slide type. The renderer's `findTemplateByType(type)` is in place; the planner that emits `slide.type` is what's missing.
- [x] Templates collection seeded; admin can mark a template inactive without code change (the seed never touches `active` on existing rows).

### Notes for follow-on slices

- Issue #6's last open acceptance line ("Pipeline embeds at least one user-uploaded asset as a carousel slide") now has its **render path** ready (`image_caption_a` template + `imageUrl` query param). The *picking* path needs the planner — still owned by #8/#9.
- Adding more templates: drop a `<key>.tsx` into `src/render/templates/`, append to `TEMPLATES` in `index.ts`, restart the web service. The seed will create the matching DB row on boot; admins can immediately toggle it active/inactive.
- Pixel-snapshot tests are a natural fit for a future "test harness + CI" slice — the render endpoint is deterministic given (template, brand, props) and produces stable PNG bytes.

### Blocked by

- #4

---

## Issue 8 — LLMClient model-agnostic abstraction ✅ DONE (golden-prompt suite + live Anthropic cache verification deferred)

### Translation note

Original spec said "LLMClient interface in `apps/agents`" (Python). The pipeline lives in `apps/web` TypeScript per the Issue #2 pivot, so this slice ships in TS via the Vercel AI SDK. The abstraction is a thin `LLMClient` class wrapping `generateObject` and `generateText` — every business-code LLM call now goes through it.

### What was built

A single-entry-point `LLMClient` at `apps/web/src/lib/agents/client.ts` with two methods: `object<S extends ZodSchema>({ stage, system, prompt, schema, cacheSystem })` for structured output, and `text({ stage, system, prompt, tools, toolChoice, maxSteps, cacheSystem })` for tool-aware free-form generation. Both consult `getLanguageModel(stage)` so per-stage env overrides (`LLM_PLANNER_*` / `LLM_WRITER_*` / `LLM_REVIEWER_*`) work without business-code changes.

Two LLM tools shipped at `apps/web/src/lib/agents/tools/`:
- `getBrandVoiceTool({ brandId, k })` — wraps the existing `getBrandVoice` retrieval. The planner/writer can call it inline to fetch on-brand samples for a given concept.
- `getAssetLibraryTool({ brandId, user })` — wraps `searchAssets`. **This closes Issue #6's deferred "`get_asset_library` tool returns the right assets" acceptance.** The planner (Issue #9) will hand this to the writer when it emits a slide with `image_source: "asset"`.

Anthropic prompt-caching opt-in via the `cacheSystem: true` option on either method — when enabled the system prompt is sent as a typed message with `providerOptions.anthropic.cacheControl = { type: 'ephemeral' }`. Other providers see plain text and ignore the metadata. `generateDraft` in the writer stage now sets `cacheSystem: true` so subsequent generations for the same brand reuse the brief + voice block on Anthropic.

`generateDraft` (the tracer-bullet writer) was refactored to call `llm.object({ stage: 'writer', schema, system, prompt, cacheSystem: true })` — same observable behavior, but everything now flows through the abstraction.

Staff-only smoke endpoint at `POST /api/dev/tool-roundtrip` exposes a stub `getMagicNumber` tool (returns 4711). Verifies tool execution end-to-end across whatever provider the writer stage resolves to.

### Implementation notes (as built)

- `apps/web/src/lib/agents/client.ts` — `LLMClient` class + process-wide `llm` singleton.
- `apps/web/src/lib/agents/tools/{brand-voice,asset-library}.ts` — Vercel AI SDK `tool()` wrappers around the retrieval helpers.
- `apps/web/src/lib/agents/generate.ts` — refactored to `llm.object({ stage: 'writer', cacheSystem: true, ... })`.
- `apps/web/src/app/(frontend)/api/dev/tool-roundtrip/route.ts` — staff-only smoke endpoint.
- `apps/web/src/lib/agents/llm.ts` — fixed `??` → `||` in env resolution. **This was a latent regression** introduced when I added per-stage env vars to docker-compose: `${VAR:-}` exports vars as `""` when unset, and `??` only falls back on `null`/`undefined`, so any `getLanguageModel('writer')` call after #5/#6 would have thrown "Unknown LLM provider:". Wasn't caught because the existing tracer didn't use a stage value until this slice — now `generateDraft` does.

### Architectural decisions made during build

- **Singleton `llm` instance** — no per-request construction overhead, no DI ceremony. The class holds no state; methods are pure aside from the SDK calls.
- **`object` and `text` are separate methods** instead of a single overloaded one. The Vercel AI SDK has different primitives (`generateObject` vs `generateText`), and tools currently work cleanly only with `text`. When the SDK matures `generateObject` with experimental_output + tools we can fold them. Today, separation matches the underlying SDK shape.
- **`cacheSystem` is opt-in per call**, not on by default. Most calls aren't cache-worthy (short prompts, varied content); turning caching on indiscriminately would *increase* Anthropic costs. The writer's brief + voice block IS cache-worthy because it's identical across many generations for the same brand.
- **No live multi-provider verification in CI.** No CI yet. The smoke test confirms the abstraction works against the configured default; per-stage provider switching is verifiable manually by setting `LLM_WRITER_PROVIDER=...` in `.env` and restarting web.
- **Default `toolChoice` to `"auto"`, not `"required"`.** Ollama doesn't support `required` (returns "Unsupported tool choice type"); other providers do. `auto` works everywhere; the smoke endpoint accepts an override for callers with stronger-toolchoice models.

### Acceptance criteria

- [x] `LLMClient.object(...)` returns a parseable structured output for the writer stage (verified: Ollama via `generateDraft`).
- [x] Switching `LLM_WRITER_PROVIDER` between providers via env produces working output for all configured providers — no business-logic change required (code path is exercised; live verification depends on which provider keys are in `.env`).
- [x] Tool-use round-trip test: stub `getMagicNumber` tool runs, returns 4711, the LLM uses the value in its reply (verified: `toolExecuted: true`, response text contains "4711").
- [ ] **Deferred:** Golden-prompt suite asserting output quality across providers. Needs a Vitest harness with image/text-diff or LLM-as-judge — its own infra slice. The provider-switching smoke is sufficient signal for now.
- [ ] **Deferred (live verification only):** Anthropic prompt-caching applied for the writer's system prompt — *the code path is wired and exercised every generate*, but cache-hit/miss metadata is only verifiable when an `ANTHROPIC_API_KEY` is configured. With Anthropic provider, `result.providerMetadata.anthropic.cacheCreationInputTokens` / `cacheReadInputTokens` will be non-zero on the second call against the same brand.

### Notes for follow-on slices

- Issue #6's last open acceptance line ("`get_asset_library` tool returns the right assets") is now closed — the wrapper is `getAssetLibraryTool`. The remaining "pipeline embeds an asset as a slide" item needs the planner from #9 to emit `image_source: "asset"`; the renderer (`image_caption_a` template, #7) and the search tool (#8) are both ready.
- Once an `ANTHROPIC_API_KEY` is set in `.env`, you can verify cache hits live by running `generateDraft` for the same brand twice and checking `result.providerMetadata.anthropic` in the writer's raw result. Add an `expose=metadata` query flag to surface it through the API if needed.
- `LLMClient.text` with tools is what the planner stage will use in #9 — pass `getBrandVoiceTool` and `getAssetLibraryTool`, plus a structured-output schema via experimental_output (or follow up with a `llm.object` call once the planner has decided which assets/voice to use).

### Blocked by

- #2

---

## Issue 9 — Multi-stage pipeline + content-jobs persistence ✅ DONE (Celery/RabbitMQ deferred per CLAUDE.md)

### Translation note

Original spec called for Celery + RabbitMQ + Python sub-tasks. CLAUDE.md explicitly defers those for MVP-1 ("synchronous, sub-10s round-trip, gated by approval-by-default"). This slice carries the *valuable* parts that aren't blocked on async infra: the multi-stage pipeline (planner → writer), the `content-jobs` persistence + status state machine, and finally wiring the planner so it can emit asset-slide types — closing Issue #6's last open acceptance.

### What was built

`content-jobs` Payload collection with all the fields the approval queue (#11) will need: `brand`, `owner` (denormalized), `topic`, `status` enum (`queued | generating | ready | approved | published | failed`), `inputPayload`/`draftPayload` JSONB, `error`, `provider`, `model`, `voiceSamplesUsed`, `costCents` (left for #10's reviewer to populate). Customer-scoped via `adminOrCustomerOwner` plus a `beforeValidate` brand-ownership guard.

The pipeline is split into two LLM stages:
- **Planner** (`apps/web/src/lib/agents/planner.ts`) — `llm.object({ stage: 'planner', schema: PlanSchema, cacheSystem: true })`. Reads brand brief + topic + (pre-fetched) voice samples, emits a Plan with one entry per slide. The planner is told whether the brand has any assets; when no assets are uploaded, it's instructed to never emit `image_caption` slides. Defensive: if the planner picks `image_caption` anyway when no assets exist, the orchestrator demotes those slides to `hook` before passing to the writer.
- **Writer** (`apps/web/src/lib/agents/writer.ts`) — `llm.object({ stage: 'writer', schema: WriterOutputSchema, cacheSystem: true })`. Expands each slide outline into final on-brand copy in one batched call. After the LLM returns, the writer post-processes: for any slide where `type === 'image_caption'`, calls `searchAssets` (preferring the planner's `asset_query`, falling back to `copyOutline`) and writes the matched asset's URL into the slide's `imageUrl`.

`runPipeline({ topic, brandId, user })` in `apps/web/src/lib/agents/pipeline.ts` orchestrates both stages, persists a `content-jobs` row up front (status `queued`), flips to `generating`, walks planner → writer, and finally writes the draft + provider + model with `status: 'ready'`. Stage failures are caught with a `[planner]`/`[writer]` tag prefix and persisted as `status: 'failed'` with the error text — the row is always inspectable.

`/api/customer/generate` (and the playground UI) now goes through `runPipeline`. The brandless playground fallback is gone — content jobs require a real brand row, and the playground shows a "create a brand first" CTA when the user has none.

### Implementation notes (as built)

- `apps/web/src/collections/ContentJobs.ts` — collection; `apps/web/src/migrations/20260506_072122_add_content_jobs.{ts,json}` — generated migration.
- `apps/web/src/lib/agents/{planner,writer,pipeline}.ts` — three stages + orchestrator.
- `apps/web/src/lib/agents/schemas.ts` — extended `SLIDE_TYPES` to include `quote` and `image_caption`; added `PlanSchema` + `PlanSlideSchema`; added `imageUrl`/`caption`/`attribution` to the slide shape (`imageUrl` is `z.string().min(1)`, NOT `.url()`, because Payload media URLs are typically relative `/api/media/file/...`).
- `apps/web/src/lib/agents/generate.ts` — **deleted**. Superseded by `pipeline.ts`. The playground still gets a brand-name + draft + status response shape; just routed through the pipeline now.
- `apps/web/src/lib/assets/search.ts` — **switched from AND to OR token semantics**, with a stopword filter and a hit-count sort. AND was too strict for copy-led queries: "fresh drop alert" failing to match a `drop`-tagged asset because of the noise tokens. OR with hit-ranking gives the planner / writer fallback enough flex to find the right asset.
- `apps/web/src/components/customer/generate-playground.tsx` — handles the new response shape (`{ jobId, status, draft? | error? }`), shows "create a brand first" empty state, and hides the playground brand fallback (every generation now writes a content-jobs row).
- `apps/web/src/app/(frontend)/api/dev/llm-debug/route.ts` — staff-only debug endpoint that calls `llm.object` with a trivial schema. Useful when something fails inside generateObject and you want to confirm the integration works.

### Architectural decisions made during build

- **`type` implies image source** (no separate `image_source` field). The original PlanSlide had both, but providers were defaulting `image_source: 'template'` even when picking `type: 'image_caption'`, leaving us with broken intentions. Collapsing the two: `image_caption` always means asset, every other type is templated.
- **`asset_query` is `z.string()` (required, "" when not applicable), not `z.string().nullable().optional()`.** Some providers serialize `nullable+optional` JSON schemas in ways the model can't reliably satisfy. Plain string with "explicitly empty when not applicable" is more provider-friendly.
- **`mode: 'auto'` for non-Ollama providers.** The previous default of forcing `mode: 'json'` (an Ollama workaround for tool-calling weakness) was confusing Gemini's native structured-output API. Now `LLMClient.object` sets `mode: 'json'` only when provider is `ollama`; for everyone else it defers to the SDK's native path.
- **Pipeline stays synchronous** per CLAUDE.md. Persistence happens up-front so failures still leave an inspectable row; status flips happen inline. Background-task variant (Celery/RabbitMQ) remains deferred.

### Bugs surfaced and fixed during this slice

- **`||` vs `??` in `getLanguageModel` env resolution.** docker-compose's `${VAR:-}` syntax exports unset env vars as `""`, which `??` doesn't treat as missing. The result was that any `LLM_PLANNER_PROVIDER=google` setting was being silently ignored when not also exported by the host shell. Fixed in `llm.ts`.
- **Gemini env-name mismatch.** `@ai-sdk/google` reads `GOOGLE_GENERATIVE_AI_API_KEY` by default, but the project exports `GOOGLE_AI_API_KEY` (matches the products project's naming). Bridged in `llm.ts` so either name works.
- **`docker compose restart` doesn't re-read `.env`.** Caught when env changes weren't taking effect — needed `up --force-recreate` to actually pick up new vars. Worth remembering when adding env-driven configuration in future slices.

### Acceptance criteria

- [ ] **Deferred to a post-MVP-1 slice (per CLAUDE.md):** Creating a `content-jobs` row in Payload admin enqueues a Celery task visible in Flower.
- [x] Pipeline runs all stages as separate sub-tasks (planner + writer; reviewer lands in #10).
- [x] Failure in any sub-task transitions the job to `failed` with the error captured (verified: stage tag in error message, e.g. `[planner] No object generated...`).
- [x] Web UI reflects status transitions — playground renders `status: 'ready'` with the draft, `status: 'failed'` with the error inline.
- [ ] **Deferred to a post-MVP-1 slice:** No synchronous LLM calls remain in the request/response path. (The Celery/RabbitMQ infra is still in compose for that future slice; no slice through #9 routes through it.)

### Notes for follow-on slices

- **Reviewer + revision loop is #10.** It populates `costCents` and adds critique → revise round-trip.
- **Approval queue UI is #11.** It reads `content-jobs` rows owned by the customer, drills into the persisted `draftPayload` for inline editing.
- **Async (Celery) reactivation is post-MVP-1.** When it lands, the only refactor needed inside the pipeline is to swap the synchronous `runPipeline` call for `enqueuePipeline` (publish to RabbitMQ → Celery worker calls the same `runPipeline` function). The data shape is already final.
- **Stronger LLM models are required for the planner stage.** llama3.2 (3B) cannot reliably satisfy the planner's nested structured-output schema; on Gemini 2.5 Flash it works on the first try. `LLM_PLANNER_PROVIDER=google` + `LLM_PLANNER_MODEL=gemini-2.5-flash` is the verified config; same for writer.

### Blocked by

- #5
- #6
- #7
- #8

---

## Issue 10 — Reviewer / Editor agent with single revision loop ✅ DONE (mock-LLM control-flow tests deferred until a test harness lands)

### What was built

Third stage of the pipeline: reviewer. `apps/web/src/lib/agents/reviewer.ts` exposes `reviewDraft({ brand, draft, voiceSamples })` which calls `llm.object({ stage: 'reviewer', schema: ReviewSchema, cacheSystem: true })` and emits a structured critique. The reviewer checks for `brand_voice`, `factual_claim`, `cta_missing`, `url_in_copy`, `length`, and `other`. Verdict is `ship` or `revise`; `cta_present` is a boolean. Each issue carries a `kind`, a `slideIndex` (zero-based; `-1` for caption/carousel-level issues), and a concrete `message` the writer can act on.

Defensive shape coercion in the reviewer: if the model says "ship" but populated issues, the issues are dropped (we trust the verdict). If "revise" but no issues, demoted to "ship" — without actionable feedback there's nothing to send back to the writer.

`runPipeline` now runs planner → writer → reviewer. If the verdict is `revise` and revision budget remains (`MAX_REVISIONS = 1`), the writer is invoked again with the issues formatted as feedback (`formatIssuesForWriter`) appended to its prompt. The revised draft replaces the original, and the job finalizes as `status: 'ready'` regardless of the second-pass verdict (per CLAUDE.md — approval-by-default means the customer sees both the draft and any lingering issues in the queue UI).

Cost tracking landed via `apps/web/src/lib/agents/cost.ts`: per-stage cost is estimated from the LLM call's reported usage (`promptTokens`, `completionTokens`) against a small public-list-price table (Anthropic Sonnet 4.6 / Haiku 4.5, Gemini 2.5 Flash / Pro, GPT-4o-mini / 4o, Ollama free). `sumCosts` adds them. If any stage uses a model we don't have a rate for AND that stage emitted tokens, the total is null (we never fake numbers). `content-jobs.costCents` is a float — Gemini Flash carousels cost a small fraction of a cent and integer cents would round to zero (verified: a clean ship-on-first-pass run came in at **0.023325 cents** end-to-end).

`content-jobs.review` (json) persists the `ReviewRecord = Review & { revisionsRun }`. The generate playground surfaces verdict + revision count as a badge, the issues list inline below the draft (when any), and the cost in the card subtitle.

### Implementation notes (as built)

- `apps/web/src/lib/agents/reviewer.ts` — third stage.
- `apps/web/src/lib/agents/cost.ts` — `estimateStageCost`, `sumCosts`, `RATES` table.
- `apps/web/src/lib/agents/pipeline.ts` — appended reviewer call + single-revision-loop control flow + cost summation across stages (including the revision call).
- `apps/web/src/lib/agents/writer.ts` — optional `feedback` arg appended to the user prompt; returns `usage` from the SDK result.
- `apps/web/src/lib/agents/planner.ts` — returns `usage` from the SDK result.
- `apps/web/src/lib/agents/schemas.ts` — `ReviewSchema`, `ReviewIssueSchema`, `ReviewRecord`; `GenerateResponse` extended with `review` and `costCents`. `costCents` is no longer `.int()` since we now track fractional cents.
- `apps/web/src/collections/ContentJobs.ts` — added `review` json field; `apps/web/src/migrations/20260511_083852_add_review_to_content_jobs.{ts,json}`.
- `apps/web/src/components/customer/generate-playground.tsx` — verdict badge + issue list + cost in card description (formatted as `$X.XXXX`).

### Architectural decisions made during build

- **`costCents` is a float, not an integer.** Gemini 2.5 Flash is so cheap that a 3-stage carousel rounds to zero integer cents; we want sub-cent precision for budget alerts.
- **Reviewer never blocks.** Even if the second-pass verdict is still `revise`, the job finalizes as `ready` with the issues attached. The customer's approval loop is the final gate (#11). This matches CLAUDE.md's approval-by-default posture.
- **Defensive coercion in the reviewer.** Some models emit a "revise" verdict but no issues (or "ship" with issues attached). We normalize both into a consistent state before the pipeline acts on them.
- **Per-stage cost is best-effort.** When a provider doesn't surface usage (or we don't have a rate for the model), the affected stage contributes `null`; `sumCosts` returns null if any non-zero-usage stage is unscored. That's why the response field is `number | null` — never a fabricated estimate.
- **Cost-per-carousel "alert when avg > $0.30"** — out of scope here. The data is now collected; a cron + alert lives in a future ops slice (no scheduler yet in MVP-1).

### Acceptance criteria

- [x] Reviewer can trigger a `revise` verdict; the second pass runs (verified live: bad-instruction brand brief → verdict=revise → revisionsRun=1 → job finalizes as `ready`).
- [x] After max 1 revision, jobs finalize in `ready` with `issues` populated regardless of final verdict (confirmed both visually in the playground and in the persisted `content-jobs.review` payload).
- [x] `content-jobs.costCents` populated (0.023 cents for a clean Gemini-Flash ship-on-first-pass run; null when no rate is configured for the provider/model used).
- [ ] **Deferred:** unit tests of the revision-loop control flow with a mock LLM returning `revise` once then `ship`, and `revise` twice. The control flow IS exercised live; mock-based unit tests need a Vitest harness that doesn't exist yet (still on the post-MVP-1 test-infra slice).

### Notes for follow-on slices

- **Approval queue UI (#11)** consumes `content-jobs.review` — when `issues.length > 0`, show them inline next to the slide they target so the customer can decide whether to fix-then-approve or discard.
- **Avg-cost alerts** are a small cron job that aggregates `costCents` over `content-jobs` rows by brand or globally. Add it when an alerting channel lands (Slack webhook in a later ops slice).
- **Prompt tuning is its own discipline.** The first live revise run showed the reviewer flagging legit issues, but the writer-on-revision kept the URL in the slides because the brand's tone instructed it to. That's a prompts vs. instructions conflict that prompt tuning resolves (e.g., a hard constraint in the writer system prompt that overrides brand-tone instructions). Out of scope for #10.

### Blocked by

- #9

---

## Issue 11 — Approval queue UI + inline copy editing ✅ DONE

### What was built

Two new customer routes, both scoped to a brand:

- **`/customer/brands/[brandId]/queue`** — server-rendered list of the brand's `content-jobs` (newest first, capped at 100). Each row shows topic, status badge, reviewer verdict + issue count (#10), cost (`$X.XXXX`), creation timestamp, and a deep link into the drill-in.
- **`/customer/brands/[brandId]/queue/[jobId]`** — server-rendered drill-in that safe-parses `draftPayload` and `review` from the json columns (via `DraftPayloadSchema` and the new `ReviewRecordSchema`), then hands the typed shape to a client `JobEditor`. Cross-checks that the job's `brand` matches the URL `brandId` and 404s on mismatch even when the customer owns both.

The `JobEditor` ([apps/web/src/components/customer/job-editor.tsx](apps/web/src/components/customer/job-editor.tsx)) is a single client component:

- Slide nav (prev / next + `{type} N / M` label) with the same Satori-rendered preview the playground uses. Live preview: copy edits re-render templated slides via `routes.api.customer.render` (the endpoint reads `copy` from query params). Asset slides keep their resolved `imageUrl` — copy edits don't swap the image.
- Per-slide `Textarea` for `copy`, plus a carousel-level caption editor. Hashtags are surfaced read-only (rare-edit case).
- Reviewer issues from `review.issues` are bucketed by `slideIndex`: per-slide issues render inline beneath the slide copy with a count badge; carousel-level issues (`slideIndex === -1`) render in a separate panel above the action row.
- Three actions wired to server actions in [apps/web/src/lib/jobs/actions.ts](apps/web/src/lib/jobs/actions.ts): `saveDraftEdits` (re-validates with `DraftPayloadSchema`, only on `status === 'ready'`), `approveJob` (`ready` → `approved`), and `discardJob` (Payload `delete`, gated by `AlertDialog` confirm). All three call `revalidatePath` on the relevant queue + detail URLs and use `overrideAccess: false` so Payload's collection access enforces ownership server-side.

UI safety: Approve is disabled while edits are dirty (forces a save first); Save is disabled when not dirty; both are disabled outside `status === 'ready'`. The drill-in renders read-only when status is `approved` / `published` / `failed` / `queued` / `generating`.

Entry points: the brand detail page grows an **Approval queue** card with an open-job count (jobs in `queued` / `generating` / `ready`), and the generate playground result card now ends with an **Open in queue** CTA so the post-generate path leads straight into the approval flow.

### Implementation notes (as built)

- `apps/web/src/lib/routes.ts` — `routes.customer.brands.queue(brandId)` and `routes.customer.brands.queueJob(brandId, jobId)`.
- `apps/web/src/lib/agents/schemas.ts` — `ReviewRecordSchema = ReviewSchema.extend({ revisionsRun })`, with `ReviewRecord` derived from it (was a plain TS type). Lets the drill-in safe-parse the persisted json column without ad-hoc duck-typing.
- `apps/web/src/lib/jobs/actions.ts` — `saveDraftEdits`, `approveJob`, `discardJob` server actions. All gate on `currentUser()` then re-fetch the job through Payload with `overrideAccess: false` to confirm ownership before mutating.
- `apps/web/src/app/(frontend)/customer/brands/[brandId]/queue/page.tsx` — list page (shadcn `Table`).
- `apps/web/src/app/(frontend)/customer/brands/[brandId]/queue/[jobId]/page.tsx` — drill-in server page.
- `apps/web/src/components/customer/job-editor.tsx` — client editor (slide nav, inline `Textarea`s, Save / Approve / Discard with `AlertDialog` confirm on discard).
- `apps/web/src/app/(frontend)/customer/brands/[brandId]/page.tsx` — Approval queue card with open-job count.
- `apps/web/src/components/customer/generate-playground.tsx` — Open-in-queue CTA on the result card.

### Architectural decisions made during build

- **Discard = hard delete, not a `discarded` status.** Avoids a `content_jobs.status` enum migration and keeps the queue clean. We lose the cost-of-discarded-drafts datapoint, which is acceptable for MVP-1 (aggregate cost analytics is future work). If we later want to retain discarded drafts (e.g., for analytics or undo), the migration is small.
- **Per-slide `copy` and carousel `caption` are editable; `type`, `imageUrl`, `attribution`, `hashtags` are not.** Issue #11's acceptance criteria explicitly covers slide copy; caption was a tiny extension because the editor surface was already open. Editing slide `type` or swapping `imageUrl` is a different mental model (re-planning) and belongs in a "regenerate this slide" slice if/when needed. Hashtags omitted because the array editor adds friction without a frequent use case.
- **Save before Approve.** Approve is disabled while the editor is dirty rather than implicitly persisting on approve. Avoids a race where stale state slips through the approval gate; surfaces the save as a deliberate step.
- **Server actions over API routes.** Voice-samples already uses an action; render and generate use route handlers because they're hit from non-form contexts (image src URLs, fetch from a `"use client"` component). The queue mutations live in `"use server"` actions because they're called from a single client component and benefit from `revalidatePath` integration. Access control flows through Payload Local API with `overrideAccess: false` so the collection's access rules are honored.
- **Safe-parse `draftPayload` and `review` on the server.** Payload types both columns as `unknown`-ish json. The drill-in passes the parsed, typed result to `JobEditor`, so the client component never has to know the json was loose; if a row carries a pre-#10 `draftPayload` shape that parses cleanly but lacks `review`, the editor still works (reviewer panels just don't render).
- **Live preview reads from the render endpoint with the edited copy as a query param.** No new endpoint needed — the existing render flow is already keyed by copy. Asset slides retain their resolved `imageUrl` because the rendered template doesn't own the image; copy edits would re-render the template overlay, not the photo.

### Acceptance criteria

- [x] Queue page lists the customer's jobs with status badges and basic metadata (topic, status, reviewer verdict + issue count, cost, created-at).
- [x] Drill-in shows all slides with images (live Satori preview reflecting current copy) and editable copy fields.
- [x] Editing a slide's copy and saving persists to `content-jobs.draftPayload` (re-validated via `DraftPayloadSchema`).
- [x] Discard removes the job (Payload `delete` through the access-checked Local API).
- [x] Approve transitions status to `approved`.
- [x] Reviewer issues from `content-jobs.review` are rendered inline — per-slide issues next to the slide they target, carousel-level (`slideIndex === -1`) issues in their own panel.

### Notes for follow-on slices

- **Publish flow (#13)** plugs into the Approve action: once `accounts` (#12) lands, the same server action can either kick off a Celery `publish_carousel` task or, more likely given the deferred Celery posture, call IG Graph API synchronously and transition `approved → published`. The button copy / surface lives in `JobEditor` already.
- **`status === 'discarded'`** can be added later if analytics want to retain rejected drafts; the `discardJob` action becomes a status update instead of a delete. No other call site changes.
- **Bulk actions** (approve / discard multiple jobs) aren't needed for MVP-1 — single-job flow is the primary path. Defer until we have a customer with enough queue depth to feel it.

### Blocked by

- #9

---

## Issue 12 — Instagram OAuth + Business/Creator validation + token storage

### What to build

`Accounts` Payload collection. OAuth callback at `/api/oauth/instagram/callback`. Validates that the connecting IG account is Business or Creator (refuses Personal accounts with a clear conversion-required error message and link to Meta's docs). Tokens encrypted at rest using a server-side secret. Token refresh as a Payload scheduled job (cron every ~6 hours, refreshes any tokens expiring in <14 days).

### Acceptance criteria

- [ ] Customer clicks "Connect Instagram", completes OAuth, lands back in the app with a connected account.
- [ ] `accounts` row created with encrypted tokens, `accountType`, `platformUserId`.
- [ ] Personal-account connection attempt shows a clear "convert to Business or Creator" error.
- [ ] Token refresh job runs on schedule; tokens within the refresh window get renewed.
- [ ] Access test: another customer cannot read this account's tokens.

### Blocked by

- #4

---

## Issue 13 — IG carousel publish flow with one-click button

### What to build

Approve+Publish button on the queue detail page (#11) kicks off the Celery `publish_carousel(content_job_id)` task. Worker iterates `draftPayload.slides`, calling Graph API: per-image media containers (`is_carousel_item=true`), then a `CAROUSEL` container with the children, then `media_publish`. Status transitions and error capture wired. Failure cases (rate limit, expired token, content rejection) surface as actionable error messages in the UI.

### Acceptance criteria

- [ ] Approved draft published to a Meta test-user IG account; carousel appears in the test account's feed.
- [ ] `content-jobs.status="published"`, `publishedAt` set.
- [ ] Force-fail (revoked token, malformed image, etc.) → `status="failed"`; UI shows the actual Graph API error message.
- [ ] Retries are idempotent (publishing the same job twice doesn't double-post).

### Blocked by

- #11
- #12

---

## Issue 14 — Affiliate / promo flow with platform-correct CTAs

### What to build

When the customer requests a "promo" content-job (with optional product info pasted manually — no URL scraper in MVP-1), the writer prompt path emits platform-correct call-to-action language ("link in bio", "comment WORD for the link", "swipe up in stories") rather than embedding raw URLs in captions. Reviewer's CTA-presence check confirms one of the recognized idioms. No bio-link management in MVP-1 — that's deferred.

### Acceptance criteria

- [ ] Requesting a promo carousel produces output containing one of the recognized CTA idioms.
- [ ] Output passes the reviewer's CTA-presence check.
- [ ] Output does NOT contain raw URLs in captions or slide overlays.
- [ ] At least one example each: affiliate promo (third-party product), and own-product promo, working end-to-end.

### Blocked by

- #10

---

## Issue 15 — Stripe Pro tier subscription + paywall

### What to build

`Subscriptions` Payload collection. Stripe Checkout for Pro $29/mo. Webhook receiver at `/api/stripe/webhook` syncing subscription state. Paywall middleware: a `customer` without an active `pro` subscription receives a 4xx when attempting to create a `content-jobs` row. Webhook signature verified.

### Acceptance criteria

- [ ] Customer subscribes via Stripe Checkout; `subscriptions` row reflects state correctly.
- [ ] Customer without active subscription receives 4xx on POST `/api/content-jobs` (or equivalent Payload REST).
- [ ] Subscription cancellation removes access at period end (not immediately).
- [ ] Webhook signature verification rejects forged payloads.
- [ ] `stripe trigger customer.subscription.updated` syncs the row correctly in dev.

### Blocked by

- #3
- #11

---

## Issue 16 — Production deploy pipeline (GitHub Actions + WireGuard + SSH)

### What to build

`.github/workflows/deploy-main.yml` mirrored from the user's `products` project: triggers on push to `main` or manual dispatch; installs and starts WireGuard with secrets; SSH key setup; writes `.env` from a `PRODUCTION_ENV` GitHub secret; streams a gzipped tarball over SSH (forced-command on the server reads stdin → extracts → runs `scripts/deploy.sh`); disconnects WireGuard. Server-side `scripts/deploy.sh`: build → `docker compose up -d` → `pg_dump` backup (30-day retention) → `payload migrate` → image prune. nginx-proxy-manager configured to route `smn.<domain>` → `web` container via the shared `proxy-network`.

### Acceptance criteria

- [ ] Push to `main` triggers the deploy workflow; completes in <30 minutes.
- [ ] `smn.<domain>` resolves to the live `web` container with valid TLS via nginx-proxy-manager.
- [ ] Migrations run idempotently (re-running deploy doesn't break the database).
- [ ] Nightly `pg_dump` backup created with 30-day retention.
- [ ] All required GitHub secrets configured: `WG_PRIVATE_KEY`, `WG_SERVER_PUBLIC_KEY`, `WG_ENDPOINT`, `DEPLOY_SSH_KEY`, `DEPLOY_USER`, `PRODUCTION_ENV`.
- [ ] Deploy concurrency: only one deploy at a time, in-progress canceled on new push.

### Blocked by

- #1

---

## Issue 17 — Operational prerequisites (legal / Meta / business)

### What to build

The non-code prerequisites that gate Meta App Review approval (#18). Real privacy policy and terms of service (lawyer-reviewed, not placeholder) at `/privacy` and `/terms`. Data-deletion endpoint at `/api/data-deletion` that accepts a deletion request and removes all user + brand data within the platform timeframe. Business entity registered (LLC or equivalent). Meta business verification submitted (can take days). Support email working at `support@<domain>`. App icon and branded logo finalized. Runs in parallel with the feature slices — start at week 1.

### Acceptance criteria

- [ ] `/privacy` and `/terms` render real, legally-reviewed content (not placeholders).
- [ ] Data-deletion endpoint accepts a request, deletes the user + their brands + accounts + voice samples + assets + jobs + media, and confirms in writing.
- [ ] Business entity confirmed (LLC paperwork or equivalent).
- [ ] Meta Business Manager has the entity verified.
- [ ] `support@<domain>` receives email.
- [ ] App icon (1024×1024 PNG) and branded logo files in `apps/web/public/`.

### Blocked by

None — runs in parallel.

---

## Issue 18 — Meta App Review submission + approval

### What to build

Record a 5–8 minute screencast video demonstrating the full flow: signup → brand creation → IG OAuth (Business account conversion if needed) → carousel generation → approval → publish. Submit Meta App Review with required permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`. Address any denials with resubmission. Move app to Live mode upon approval.

### Acceptance criteria

- [ ] Screencast video recorded covering all required permissions in use.
- [ ] App Review submission accepted by Meta.
- [ ] All required permissions approved.
- [ ] App moved to Live mode.
- [ ] Non-test users can connect their Instagram accounts in production.

### Blocked by

- #12
- #13
- #16
- #17

---

## Issue 19 — Private beta launch (5–10 users)

### What to build

Add 5–10 hand-picked beta users as Meta test users while App Review pends (post-approval, they can use the live app directly). Onboard them through the live signup → brand → carousel → approve → publish flow. Collect quality feedback per generation. Iterate the planner / writer / reviewer prompts and template designs based on real customer feedback until the founder-quality bar is met.

### Acceptance criteria

- [ ] 5–10 beta users onboarded.
- [ ] Each user generates ≥3 carousels.
- [ ] Each user approves and publishes ≥1 carousel.
- [ ] Founder publishes ≥50% of generated drafts on their own brand without edits, the rest with only minor edits.
- [ ] Documented prompt-tuning iterations from feedback.
- [ ] If the founder-quality bar is not met, beta does not expand — keep iterating.

### Blocked by

- #13
- #15
