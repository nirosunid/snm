# Issues: Social Media Manager SaaS — MVP-1

> **Status:** Draft — pending publication to issue tracker (none configured yet). **Issues #1 and #2 are done; #3 is the active slice.**
>
> **Architecture note:** The stack pivoted during Issue #2. The agent pipeline now lives in `apps/web` TypeScript (Vercel AI SDK + Zod), not in `apps/agents` Python. RabbitMQ/Celery/Flower are deferred. Customer-facing routes are prefixed with `/customer`. See `CLAUDE.md` (repo root) for the current architecture; `social-media-saas-mvp-1.md`'s preamble explains the deltas. Issues #5+ below still describe the Python `/embed` endpoint — that endpoint will land in `apps/web` instead, served from a TS route under `/api/customer/embed`.
>
> **Source:** [social-media-saas-prd.md](./social-media-saas-prd.md), [social-media-saas-mvp-1.md](./social-media-saas-mvp-1.md).
>
> **How to use this file:** when an issue tracker (GitHub Projects, Linear, Jira, etc.) is configured, copy each `## Issue N` section into a new ticket. Apply the `needs-triage` label to each. Cross-reference numbers as you create them — the "Blocked by" field uses `#N` placeholders that map to the order below; replace with real issue identifiers as you go.
>
> **Critical path:** `#1 → (#3, #4 parallel) → #5, #6, #7, #8 → #9 → #10, #11, #12, #14 → #13 → #15 → #16 → #17 → #18 → #19`. `#16` and `#17` run in parallel from week 1.

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
- [ ] **Deferred to Issue #3:** auth gating on `/customer/generate`. Currently public.

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

## Issue 4 — Brand creation flow + brand profile UI

### What to build

`Brands` Payload collection with the brand brief (tone, niche, target audience, dos, donts, vocabulary), brand palette (primary, secondary, accent, background, text), font (select from 3–5 shipped options), and logo (Payload upload → media collection). Multi-step form for customers to create a brand. Brand-detail page renders the captured profile. Replaces the hardcoded brand from #2.

### Acceptance criteria

- [ ] Customer creates a brand via the UI; row persists with all fields populated.
- [ ] Logo uploads to the `media` collection; preview renders on the detail page.
- [ ] Brand-detail page renders palette swatches and the selected font.
- [ ] Access test: another customer cannot read this brand's row via REST.
- [ ] One customer can have multiple brands (E1 multi-brand-per-user, even if MVP-1 UI emphasizes one).

### Blocked by

- #3

---

## Issue 5 — Voice samples ingest with pgvector retrieval

### What to build

`voice-samples` Payload collection with a custom `vector(1536)` field (HNSW or IVFFlat index). Paste-N-samples textarea on the brand page splits input into individual samples and POSTs to a new `apps/agents` `/embed` endpoint, which returns embeddings (default model `text-embedding-3-small`). Vectors are stored in the new collection. The pipeline writer in #2 starts pulling top-K stylistically similar samples per generation. Output should be noticeably more on-brand vs the hardcoded version.

### Acceptance criteria

- [ ] Customer pastes ≥10 samples on the brand page; rows persist with non-null embeddings.
- [ ] Direct pgvector query (`order by embedding <-> <query_vec> limit 5`) returns ranked-by-similarity samples.
- [ ] Pipeline writer prompt now includes top-K voice samples retrieved by similarity to the topic.
- [ ] A/B comparison: same topic generated with and without voice retrieval — the retrieval version visibly mimics the brand's voice.
- [ ] Brand-detail page shows the sample count.

### Blocked by

- #4

---

## Issue 6 — Asset library with tag-based retrieval

### What to build

`Assets` Payload collection backed by Payload media uploads, with a `tags` field (array of text). Drag-drop upload UI on a brand library page; tag-filter and simple text-search across tags. New `get_asset_library(brand_id, query)` tool exposed to the LLM. The pipeline picks an uploaded asset for one slide when the planner emits `image_source: "asset"`.

### Acceptance criteria

- [ ] Customer uploads ≥3 assets with tags; library page lists them with thumbnails.
- [ ] Tag-filter narrows the listing.
- [ ] `get_asset_library` tool returns the right assets for a sample query (e.g., "shoes" returns shoe-tagged assets only).
- [ ] Pipeline embeds at least one user-uploaded asset as a carousel slide for an appropriate request.
- [ ] Access test: another customer cannot list this brand's assets.

### Blocked by

- #4

---

## Issue 7 — Slide template library + Satori renderer

### What to build

Approximately 15 hand-designed React templates in `apps/web/src/render/templates/` covering hook (×3), listicle (×3), quote (×2), product card (×3), CTA (×2), spec callout (×2), comparison (×1). `Templates` Payload collection seeded from code (editable by `admin`). `/api/render` polished: accepts `{ template_id, props }`, applies brand palette + font + logo automatically, returns a PNG and uploads to the `media` collection. `/dev/templates` page renders all templates against 3 brand palettes for visual QA. Pixel-snapshot tests on 3 representative templates.

### Acceptance criteria

- [ ] All ~15 templates render correctly at `/dev/templates` with 3 different brand palettes.
- [ ] POST to `/api/render` returns a valid PNG of the expected dimensions for any template.
- [ ] Brand palette colors verifiable in the output (snapshot check on 3 templates).
- [ ] Pipeline picks an appropriate template based on the planner's slide type.
- [ ] Templates collection seeded; admin can mark a template inactive without code change.

### Blocked by

- #4

---

## Issue 8 — LLMClient model-agnostic abstraction

### What to build

`LLMClient` interface in `apps/agents` with adapters for Anthropic and Gemini at minimum (Ollama and OpenAI scaffolded for later). Per-stage env-driven selection: `LLM_PLANNER`, `LLM_WRITER`, `LLM_REVIEWER`, with `DEFAULT_LLM_PROVIDER` fallback. Tool-use round-trips work uniformly across adapters. Anthropic prompt-caching enabled under the abstraction where applicable. Replaces the direct provider call from #2 across the entire codebase. Golden-prompt regression suite running against all configured providers.

### Acceptance criteria

- [ ] `LLMClient.generate(prompt, schema, tools?)` returns a parseable structured output (Pydantic) for Anthropic, Gemini.
- [ ] Switching `LLM_WRITER` between providers via env produces working output for all configured providers — no business-logic change required.
- [ ] Tool-use round-trip test: a fake tool returning a known string is invoked and its result reaches the LLM.
- [ ] Golden-prompt suite asserts output quality across configured providers (LLM-as-judge or fixture diff).
- [ ] Anthropic prompt-caching applied for the writer's system prompt + brand-voice context (verified via response metadata).

### Blocked by

- #2

---

## Issue 9 — Celery + RabbitMQ wiring; pipeline becomes async

### What to build

The pipeline migrates from a synchronous Python function (held over from #2) to a Celery task with sub-tasks per stage (`plan`, `write`, `resolve_assets`, `compose`). A Payload `content-jobs.afterCreate` hook publishes the message that kicks off the pipeline. Status state machine wired (`queued → generating → ready → failed`). Web UI polls the job row and reflects status changes.

### Acceptance criteria

- [ ] Creating a `content-jobs` row in Payload admin enqueues a task visible in Flower.
- [ ] Pipeline runs all stages as separate sub-tasks; each retries independently.
- [ ] Failure in any sub-task transitions the job to `failed` with the error captured.
- [ ] Web UI reflects status transitions (queued → generating → ready or failed).
- [ ] No synchronous LLM calls remain in the request/response path.

### Blocked by

- #5
- #6
- #7
- #8

---

## Issue 10 — Reviewer / Editor agent with single revision loop

### What to build

Reviewer LLM call appended to the pipeline. Critiques brand-voice match, factual claims, and CTA presence. Returns `{ verdict: "ship" | "revise", issues: [...] }`. If `revise` and revision budget remains (max 1), loops back to the writer with the issues as feedback. If still `revise` after retry, the job finalizes in `ready` with the issues attached for the customer to see in the queue UI. Cost-per-carousel logged on the job row.

### Acceptance criteria

- [ ] Reviewer triggers a `revise` verdict at least once during testing on a deliberately weak draft; the second pass ships.
- [ ] After max 1 revision, jobs finalize in `ready` with `issues` populated regardless of final verdict.
- [ ] `content-jobs.cost_cents` (or equivalent) populated; alert when average exceeds $0.30 per carousel.
- [ ] Tests: revision-loop control flow with a mock LLM returning `revise` once, then `ship`; same returning `revise` twice.

### Blocked by

- #9

---

## Issue 11 — Approval queue UI + inline copy editing

### What to build

`/brands/[brandId]/queue/` page listing the customer's `content-jobs` rows with status badges. Drill-in `/queue/[jobId]/` page showing the carousel preview slide-by-slide, per-slide inline copy editor, Approve / Discard buttons. Persistence to `draftPayload` on edit.

### Acceptance criteria

- [ ] Queue page lists the customer's jobs with status badges and basic metadata.
- [ ] Drill-in shows all slides with images and editable copy fields.
- [ ] Editing a slide's copy and saving persists to `content-jobs.draftPayload`.
- [ ] Discard removes the job (or marks it discarded — design decision in the slice).
- [ ] Approve transitions status to `approved`.
- [ ] Customer can see issues from the reviewer (#10) inline if `issues` is populated.

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
