# Plan: Social Media Manager SaaS with AI Content Agents

## Context

Greenfield SaaS that lets users connect social-network accounts and have AI agents draft and publish content for them. Target: solo creators and small businesses, with multi-account-per-user as a built-in feature. Working directory `/Users/sorin.dinu/Work/projects/smn` is empty; no prior code or `git` history.

The product surface area is large (multi-platform OAuth, AI agent pipeline, brand voice RAG, image rendering, scheduled posting, approval queues, pricing tiers, Meta/TikTok app reviews). Without explicit scope discipline this is 4–8 months of work. The plan below intentionally cuts the **MVP-1 (tracer bullet)** down to a 4–6 week shippable surface that validates the riskiest unknown — *AI output quality on real brands* — before investing in the deferred features.

The full vision is documented in *Section 9 — Roadmap beyond MVP-1*.

---

## MVP-1 scope (4–6 weeks to private beta)

### Goals
- Validate AI-generated content quality on real user brands.
- Run the full pipeline end-to-end for the founder + 5–10 hand-picked beta users.
- Land in Meta App Review with a working private beta to point at (improves approval odds).

### In scope
1. **Auth & accounts**: Supabase Auth signup/login. User → Brand → Account hierarchy in Postgres.
2. **Brand setup**: 5-question brief (tone, niche, audience, dos, donts), brand palette + font + logo, paste-N-samples voice import (no IG-OAuth import yet).
3. **Instagram OAuth + Business/Creator account validation** (Meta Graph API). Token storage encrypted in Postgres.
4. **Asset library**: per-brand uploaded images, simple tag/search.
5. **Content generation pipeline** (Inngest-orchestrated):
   - Planner agent (Claude Haiku or Gemini Flash, configurable): produces structured slide plan (count, type per slide, copy outline, image source per slide).
   - Writer agent (Claude Sonnet 4.6): per-slide copy, with tools for `getBrandVoice(brandId, query)` (pgvector top-K) and `getAssetLibrary(brandId, query)`.
   - Visual Director (code, no LLM in MVP-1): resolves each slide via template render or asset lookup.
   - Editor agent (Claude Sonnet 4.6): critique pass for brand-voice match, factual claims, CTA presence. One revision loop max.
6. **Slide renderer**: Satori (JSX → SVG → PNG) with ~15 hand-designed templates organized by slide type (hooks, listicles, quotes, product cards, CTAs, spec callouts). Brand palette/font/logo applied to all templates automatically.
7. **Approval queue UI**: list of generated drafts; preview each carousel slide-by-slide; edit copy inline; approve / publish / discard.
8. **Direct publish to IG**: build `CAROUSEL` container via Graph API; publish on user action (no auto-publish in MVP-1 — toggle deferred).
9. **Pricing**: single Pro tier, $29/mo via Stripe. No Free tier in MVP-1, no Power tier.
10. **Operational basics**: privacy policy page, ToS page, support email, data-deletion endpoint, business entity ready for Meta App Review submission.

### Out of MVP-1 (cut from S2 — see Section 9 for re-entry order)
- TikTok integration (Photo Mode + OAuth + Content Posting API + review)
- News-awareness tool (Tavily/Bing News)
- Continuous-learning RAG loop (approved drafts → embedding store)
- Bio-link / linktree management page
- URL scraper for product/affiliate pages (paste manually for now)
- Stock library integration (Pexels/Unsplash)
- Synthetic image gen via Replicate
- Free tier and Power tier
- Python skeleton service (deferred until first Python-edge feature surfaces)
- Auto-publish toggle (everything is approval-required in MVP-1)
- Multi-brand workspace UI polish (1 brand per user is fine for v1; multi-brand schema is in place but UI emphasizes single brand)

---

## Architecture

### Tech stack
- **Frontend + main backend**: Next.js 15 (App Router, TypeScript). Single codebase for UI, API routes, OAuth flows, approval queue, billing.
- **Database**: Supabase Postgres + `pgvector` extension (preinstalled). Hot-path server-side queries go through **Drizzle ORM with the direct `DATABASE_URL` connection** — zero PostgREST overhead, identical performance to vanilla Postgres.
- **Auth**: Supabase Auth (email/password + OAuth). Server-side session reading via `@supabase/ssr` in Next.js middleware.
- **Object storage**: Supabase Storage (S3-compatible) for uploaded brand assets and rendered slide PNGs. Server-side signed URL generation via `supabase-js`.
- **Background jobs**: Inngest (TS workers in MVP-1; Python worker added when a Python-edge feature ships). Step orchestration drives the agent pipeline.
- **AI orchestration**: Vercel AI SDK at every LLM call site. No direct `@anthropic-ai/sdk` or `openai` imports in business logic.
  - Per-task model env: `LLM_PLANNER` (default `claude-haiku-4-5`), `LLM_WRITER` (default `claude-sonnet-4-6`), `LLM_REVIEWER` (default `claude-sonnet-4-6`).
  - Anthropic prompt caching enabled via provider options for the writer's system prompt + brand-voice few-shots (cost win — same context reused per brand).
- **Slide renderer**: Satori (`@vercel/og` lib).
- **Image generation** (when re-introduced post-MVP-1): Replicate gateway. Model selection by string. No direct provider integrations.
- **Hosting**: Vercel for Next.js. Inngest and Supabase are managed.
- **Payments**: Stripe (single $29/mo subscription product in MVP-1).

### Data model (Drizzle schema)
- `user` — mirror of `auth.users` (id matches Supabase Auth user_id, email, created_at). Synced via Supabase Auth trigger or on first sign-in.
- `brand` — id, user_id, name, niche, audience, tone_brief (jsonb: tone, dos, donts, vocabulary), palette (jsonb), font, logo_url, created_at.
- `account` — id, brand_id, platform (`instagram` only in MVP-1), platform_user_id, encrypted_access_token, encrypted_refresh_token, token_expires_at, account_type (`business` | `creator`).
- `voice_sample` — id, brand_id, source (`brief` | `pasted_sample`), content (text), embedding (`vector(1536)`), created_at.
- `asset` — id, brand_id, storage_key (Supabase Storage path), mime_type, tags (text[]), uploaded_at.
- `content_job` — id, brand_id, account_id, type (`carousel` | `post`), status (`queued` | `generating` | `ready` | `approved` | `published` | `failed`), input_payload (jsonb), draft_payload (jsonb), error (text, nullable), inngest_run_id, created_at, published_at.
- `subscription` — id, user_id, stripe_customer_id, stripe_subscription_id, tier (`pro`), status, current_period_end.

pgvector index on `voice_sample.embedding` (`ivfflat` or `hnsw`).

### AI agent pipeline (Inngest function: `generate-carousel`)
Steps run as separate Inngest steps for durability and observability:

1. **`step.run("plan")`** — Claude Haiku call via AI SDK with structured-output Zod schema:
   ```ts
   { slides: { type: "hook" | "listicle" | "quote" | "product" | "cta" | "spec",
               copy_outline: string,
               image_source: "template" | "asset",
               asset_query?: string,
               template_id?: string }[] }
   ```
   Tools available: `getBrandProfile(brandId)`. (No news tool in MVP-1.)

2. **`step.run("write")`** — Claude Sonnet call per slide (or single batched call) with structured output `{ slides: { final_copy: string, image_prompt?: string }[] }`. Tools: `getBrandVoice(brandId, query)` (pgvector top-5), `getAssetLibrary(brandId, query)`.

3. **`step.run("resolve-assets")`** — code only, no LLM. For each slide: render Satori template with copy/data, or fetch the picked asset from Supabase Storage.

4. **`step.run("compose")`** — code only. Assemble slides into `draft_payload` JSON: `{ slides: [{ image_url, caption_overlay }], caption: string, hashtags: string[] }`.

5. **`step.run("review")`** — Claude Sonnet call with the draft. Outputs `{ verdict: "ship" | "revise", issues: string[] }`.

6. **If `revise` and revisions remaining**: loop back to step 2 with feedback. Max 1 revision.

7. Set `content_job.status = "ready"`. UI polls or uses Server-Sent Events for progress.

### Image rendering pipeline (Satori)
- `src/lib/render/templates/` — one React component per template (`<HookTemplate>`, `<ListicleTemplate>`, `<QuoteTemplate>`, `<ProductTemplate>`, `<CTATemplate>`, `<SpecTemplate>`). Each takes typed props (copy, brand palette, brand logo, font, image_url for asset slides).
- `src/lib/render/satori.ts` — wraps Satori with brand palette + font loading + outputs PNG buffer; uploads to Supabase Storage `rendered-slides` bucket; returns signed URL.
- Fonts: ship 3–5 brand-friendly fonts (Inter, Playfair, etc.); user picks one in brand setup. Load via Satori's `loadFont`.

### IG publishing flow (`publish-carousel` Inngest function)
1. For each slide PNG, call `POST /{ig-user-id}/media` with `media_type=IMAGE`, `image_url`, `is_carousel_item=true` → media container ids.
2. Call `POST /{ig-user-id}/media` with `media_type=CAROUSEL`, `caption`, `children=<csv of ids>` → carousel container id.
3. Call `POST /{ig-user-id}/media_publish` with carousel container id → published post id.
4. Update `content_job.status = "published"`, `published_at = now()`.
5. On any step failure: capture error, set `status = "failed"`, surface in UI.

### Model-agnostic abstraction (`src/lib/ai/llm.ts`)
- `generateContent({ task: "plan" | "write" | "review", input, schema?, tools? })` — picks model from env per task; calls Vercel AI SDK; applies Anthropic prompt-caching options when provider is Anthropic; returns typed output.
- Prompts written model-neutral (no provider-specific tags).
- CI: golden-prompt suite that runs the planner/writer/reviewer prompts against Claude Sonnet, Claude Haiku, Gemini Flash, GPT-5; LLM-as-judge or fixture-diff to assert quality before swapping models in production.

---

## Build sequence

Phased so each phase produces something runnable end-to-end, even if shallow.

### Phase 0 — Foundations (~3 days)
- `npx create-next-app` (App Router, TypeScript, Tailwind), Drizzle, `@supabase/supabase-js`, `@supabase/ssr`, Inngest CLI, Stripe SDK, Vercel AI SDK with `@ai-sdk/anthropic` + `@ai-sdk/google` + `@ai-sdk/openai`, Satori (`@vercel/og`), `zod`.
- Supabase project created; `pgvector` enabled; `DATABASE_URL` (direct connection, port 5432) wired into Drizzle config.
- Drizzle schema for all tables in § Data model. `drizzle-kit push` to Supabase.
- Supabase Auth wired into Next.js middleware via `@supabase/ssr`; `(auth)` and `(app)` route groups; `auth.users` → public `user` row sync (trigger or first-sign-in code path).
- Supabase Storage buckets created: `brand-assets` (private; signed URLs), `rendered-slides` (private; signed URLs).
- Privacy / ToS pages drafted (template-based; refine before App Review).

### Phase 1 — Brand setup + voice (~5 days)
- Brand creation flow: 5-question brief, palette picker, font picker, logo upload (Supabase Storage).
- Paste-samples voice import: textarea, split into samples, generate embeddings via `text-embedding-3-small`, upsert into `voice_sample` with `source='pasted_sample'`.
- pgvector index migration; `getBrandVoice(brandId, query)` SQL helper.
- Brand-detail UI showing the brand profile and sample count.

### Phase 2 — Asset library (~2 days)
- Upload UI: drag-drop, multi-file, tag input.
- Supabase Storage upload via signed POST URLs (browser direct-uploads to the `brand-assets` bucket); server-side records the storage key + tags in `asset` table; thumbnails generated server-side.
- Search UI: tag-filter + simple text search across tags.

### Phase 3 — Templates + Satori renderer (~7 days, design-heavy)
- Hand-design ~15 templates as React components (hook, listicle x3, quote x2, product card x3, CTA x2, spec callout x2, comparison x1, plain image+caption x1).
- `src/lib/render/satori.ts` wrapper.
- Test harness: render each template with sample data + each of 3 brand palettes; visually QA in Storybook or a `/dev/templates` page.

### Phase 4 — AI pipeline (~7 days)
- `src/lib/ai/llm.ts` model-agnostic wrapper.
- Tool definitions (`getBrandProfile`, `getBrandVoice`, `getAssetLibrary`).
- Inngest function `generate-carousel` with all steps.
- Prompts (planner/writer/reviewer) iterated against the founder's own brand for 1–2 days of quality tuning.
- Approval queue UI: list of `content_job` rows; carousel preview component; per-slide edit-copy modal; approve / discard buttons.

### Phase 5 — IG OAuth + publishing (~5 days)
- Meta App created in dev mode; test users added.
- IG OAuth flow: callback handler, Business/Creator validation, encrypted token storage, scheduled refresh.
- `publish-carousel` Inngest function (steps in § IG publishing flow).
- Error surfacing in UI when publish fails (rate limits, expired tokens, content rejections).

### Phase 6 — Billing + polish (~3 days)
- Stripe single-tier subscription, `subscription` table sync via webhook.
- Paywall middleware: gate carousel generation on active subscription.
- Onboarding polish: welcome email, empty-state UX, in-app tour.

### Phase 7 — App Review submission + private beta (~ongoing)
- Screencast video demo (5–8 minutes showing the full flow).
- App Review submission with all required permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `business_management`.
- While waiting on review: invite 5–10 hand-picked beta users (test users in Meta config until approved). Iterate on AI quality from their feedback.

**Realistic timeline**: Phases 0–6 ≈ ~32 working days (≈ 4–6 weeks for solo dev with no major blockers). Meta App Review wait runs in parallel during Phase 6/7.

---

## File / module structure

```
smn/
├── app/                                    # Next.js App Router
│   ├── (auth)/sign-in/page.tsx
│   ├── (auth)/sign-up/page.tsx
│   ├── (app)/layout.tsx                    # Supabase Auth + nav shell
│   ├── (app)/dashboard/page.tsx
│   ├── (app)/brands/new/page.tsx
│   ├── (app)/brands/[brandId]/page.tsx     # brand overview
│   ├── (app)/brands/[brandId]/voice/page.tsx
│   ├── (app)/brands/[brandId]/library/page.tsx
│   ├── (app)/brands/[brandId]/queue/page.tsx       # approval queue
│   ├── (app)/brands/[brandId]/queue/[jobId]/page.tsx  # carousel preview / edit
│   ├── (app)/billing/page.tsx
│   ├── (legal)/privacy/page.tsx
│   ├── (legal)/terms/page.tsx
│   ├── api/oauth/instagram/callback/route.ts
│   ├── api/inngest/route.ts
│   ├── api/stripe/webhook/route.ts
│   └── api/data-deletion/route.ts          # required for Meta App Review
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts                   # Drizzle schema
│   │   │   ├── client.ts                   # Drizzle client (DATABASE_URL → Supabase Postgres)
│   │   │   └── queries.ts                  # typed query helpers
│   │   ├── ai/
│   │   │   ├── llm.ts                      # model-agnostic wrapper (Vercel AI SDK)
│   │   │   ├── tools/
│   │   │   │   ├── brand-profile.ts
│   │   │   │   ├── brand-voice.ts          # pgvector retrieval
│   │   │   │   └── asset-library.ts
│   │   │   ├── prompts/
│   │   │   │   ├── planner.ts
│   │   │   │   ├── writer.ts
│   │   │   │   └── reviewer.ts
│   │   │   └── schemas.ts                  # Zod schemas for structured outputs
│   │   ├── render/
│   │   │   ├── satori.ts
│   │   │   └── templates/
│   │   │       ├── hook.tsx
│   │   │       ├── listicle.tsx
│   │   │       ├── quote.tsx
│   │   │       ├── product-card.tsx
│   │   │       ├── cta.tsx
│   │   │       ├── spec-callout.tsx
│   │   │       └── ... (~15 total)
│   │   ├── platforms/
│   │   │   └── instagram/
│   │   │       ├── oauth.ts                # token exchange, refresh
│   │   │       ├── publish.ts              # carousel publishing flow
│   │   │       └── api.ts                  # thin Graph API wrapper
│   │   ├── storage/
│   │   │   └── supabase-storage.ts         # signed URL helpers (uploads + reads)
│   │   ├── auth/
│   │   │   ├── server.ts                   # `createServerClient` via @supabase/ssr
│   │   │   └── middleware.ts               # session refresh in Next.js middleware
│   │   └── billing/
│   │       └── stripe.ts
│   ├── inngest/
│   │   ├── client.ts
│   │   ├── functions/
│   │   │   ├── generate-carousel.ts
│   │   │   └── publish-carousel.ts
│   │   └── index.ts                        # function registry
│   ├── components/                         # shadcn-style UI components
│   └── styles/globals.css
├── drizzle/                                # migrations
├── .env.local                              # local secrets
└── package.json
```

---

## Local development

- **Docker Desktop** (or **OrbStack** on macOS — lighter, faster) — required for the Supabase CLI.
- **Supabase CLI** — `supabase start` spins up a local Supabase stack (Postgres + pgvector + Auth + Storage + Studio dashboard) via Docker. Mirrors production config; no need to develop against the cloud project. Schema changes managed via `supabase migration new` + `supabase db reset`.
- **Inngest CLI** — `npx inngest-cli@latest dev` runs a local dev server. No Docker.
- **Stripe CLI** — `stripe listen` for webhook testing. No Docker.
- **Next.js dev server** — `npm run dev` against the local Supabase.
- `.env.local` points `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` at the local Supabase output (`supabase status` prints them).

**Production deployment** does not require Docker for MVP-1: Vercel builds and deploys Next.js natively from Git; Supabase, Inngest, Stripe are managed services. Docker becomes a deploy artifact only when the Python service lands (roadmap item #8) — `python/Dockerfile` for Modal or Fly.io.

---

## Operational prerequisites (start in parallel with Phase 0)

- Privacy policy + ToS drafted on a domain you own.
- Business entity (LLC or equivalent) registered.
- Meta Developer account with the entity verified (Business Verification can take days).
- App icon + branded logo + screencast tooling ready before Phase 7.
- Support email working (e.g., `support@<domain>`).
- Data-deletion endpoint shipped and tested by Phase 7 — required for Meta App Review.

---

## Roadmap beyond MVP-1 (cut features, in re-entry order)

| Order | Feature | Why this order |
|---|---|---|
| 1 | Continuous-learning RAG loop | Cheapest add (one Inngest step on approval), high quality compounding for retention |
| 2 | URL scraper for affiliate / product pages | Removes manual paste step; unblocks the "promo a Mercedes SL" flow at low cost |
| 3 | Bio-link / linktree management | Required to make affiliate flow actually convert |
| 4 | TikTok integration (OAuth + Photo Mode + Content Posting API) | Needs TikTok app review on its own timeline; submit early in this phase |
| 5 | Stock library + synthetic image gen via Replicate | Moves us off "templates + uploaded only"; expands creative range |
| 6 | News-awareness tool (Tavily / Bing News) | Good differentiator once base quality is solid |
| 7 | Free tier + Power tier + multi-brand UI polish | Pricing expansion once Pro tier is converting |
| 8 | Python skeleton deployed | Surfaces when first Python-edge task lands (background removal for product photos is the most likely first task) |
| 9 | Reels (templated stock-reel flavor → later Veo 3 synthetic) | Brings YouTube Shorts back into platform set; needs Remotion + video pipeline |
| 10 | Auto-publish toggle | Only after quality is high enough that users trust unattended publishing |

---

## Verification

After each phase, prove the slice works end-to-end before moving on.

### Phase 1 (Brand + voice) verification
- Create a brand, fill the brief, paste 10 sample posts.
- Inspect Supabase SQL editor: `select count(*) from voice_sample where brand_id = ...` returns 10.
- pgvector query: `select content from voice_sample order by embedding <-> <query_embedding> limit 5` returns ranked-by-similarity samples.

### Phase 3 (Templates) verification
- `/dev/templates` page renders all ~15 templates with sample copy.
- Switch the brand palette in dev tools → all templates re-render with the new colors.
- Inspect output: PNGs uploaded to Supabase Storage `rendered-slides` bucket, accessible via signed URLs.

### Phase 4 (AI pipeline) verification
- Trigger `generate-carousel` for a real brand with the prompt "create a carousel about [a real product or topic the brand cares about]".
- Inngest dashboard shows all 5 steps green.
- `content_job.draft_payload` contains 5 slides with copy, image URLs, and a caption.
- Open the queue UI → see the draft → preview each slide → all visible, on-brand.
- Reviewer step demanded a revision at least once during quality tuning, and the second pass shipped.

### Phase 5 (IG OAuth + publish) verification
- OAuth flow: connect a Meta test-user IG Business account; tokens stored encrypted; refresh works.
- Trigger `publish-carousel` on a draft → carousel appears on the test IG account.
- Force-fail one Graph API call → `content_job.status = 'failed'` and the UI shows the actual error message.

### Phase 7 (App Review + beta) verification
- Meta App Review submission accepted (or denials addressed and resubmitted).
- 5–10 invited beta users have each generated at least 3 carousels and approved/published at least 1.
- Quality bar: the founder is willing to publish at least 50% of generated drafts on their own brand without edits, and the rest with only minor edits. If this bar isn't met, do not invite more users — keep iterating on prompts and templates.

### Continuous (across all phases)
- Golden-prompt CI suite runs against Claude Sonnet, Claude Haiku, Gemini Flash, GPT-5; output deltas reviewed before any model swap in production.
- Stripe webhook → `subscription` table sync verified with `stripe trigger customer.subscription.updated`.
- Cost dashboard: per-carousel LLM + image cost tracked per `content_job`; alert if average exceeds $0.30.
