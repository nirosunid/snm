# PRD: Social Media Manager SaaS with AI Content Agents

> **Status:** Draft — pending publication to issue tracker (none configured yet — see *Further Notes*).
>
> **Companion docs:** [social-media-saas-mvp-1.md](./social-media-saas-mvp-1.md) (architecture + build sequence).

## Problem Statement

Solo creators and small business owners want a consistent, on-brand social-media presence on Instagram — especially in carousel format, which has the highest engagement on the platform. Producing one good carousel post manually takes hours: thinking up an angle, writing a hook, drafting copy per slide, sourcing or shooting on-brand photos, designing visually consistent slides, scheduling, and posting. Most existing AI content tools generate generic-sounding output that doesn't match the user's voice, produce slides that look visually inconsistent within a single carousel, can't reliably depict real branded products (e.g., a Mercedes SL or a specific Amazon SKU), and either auto-publish content the user never reviewed (a brand-safety risk) or require so much manual fix-up that the time saved is illusory.

These users are also vulnerable: their account *is* their brand or business. They cannot afford a hallucinated factual claim, a tonally off-brand caption, or a violation of platform terms of service that gets their account throttled or banned. The tools that promise the most automation (fully autonomous AI agents, content farms operating many accounts) are precisely the tools whose output patterns Instagram and TikTok actively suppress, putting any account that uses them at risk.

## Solution

A self-serve SaaS where customers connect their Instagram Business or Creator account, set up a Brand profile (a 5-question brief, a brand color palette, a font, a logo, and 10 pasted sample posts), and request carousels by topic, product, or affiliate URL. Four logical AI agents collaborate on each carousel: a Planner picks the slide structure, a Writer drafts on-brand copy per slide using the brand's voice samples retrieved via vector search, a Visual Director assembles each slide using either a templated renderer (15 hand-designed templates, brand colors and fonts applied automatically) or a real photo from the user's uploaded asset library, and an Editor reviews the result against the brand brief and flags issues for one revision pass.

Drafts land in an approval queue. The customer reviews each slide, edits copy inline if needed, and clicks publish — at which point the system handles the Instagram Graph API container build and publish steps. Every post is approved by a human before it lands, which is also the brand-safety differentiator versus tools that ship auto-publishing as the default. Pricing is a single Pro tier at $29/month for the launch.

## User Stories

1. As a solo creator, I want to sign up with email and password, so that I can start using the product immediately.
2. As a solo creator, I want to create a Brand profile separate from my user account, so that I can manage multiple brand identities later.
3. As a solo creator, I want to fill out a 5-question brand brief covering tone, niche, target audience, dos, and don'ts, so that the AI has a baseline understanding of my brand.
4. As a solo creator, I want to pick a brand color palette and a font, so that all generated slides share a consistent visual identity.
5. As a solo creator, I want to upload my brand logo, so that it appears on slide templates that include it.
6. As a solo creator, I want to paste at least 10 of my best past posts, so that the AI learns my actual writing voice rather than guessing from a brief.
7. As a solo creator, I want to upload my own product or inventory photos to a per-brand asset library, so that the AI can use real photos of my actual products.
8. As a solo creator, I want to tag my uploaded assets, so that the AI can find the right photo for each slide it plans.
9. As a solo creator, I want to connect my Instagram Business or Creator account via OAuth, so that the system can publish on my behalf.
10. As a solo creator, I want to be told clearly when my Instagram account is *not* a Business or Creator account and what to do about it, so that onboarding doesn't silently fail.
11. As a solo creator, I want to request a carousel about a topic I describe, so that the AI drafts it for me end-to-end.
12. As a solo creator, I want to request a promo carousel for a specific product I supply, so that I can promote products I care about without manual carousel-building.
13. As a solo creator running affiliate content, I want the AI to write platform-appropriate calls-to-action ("link in bio", "comment WORD for the link") rather than insert raw URLs into captions, so that my posts work correctly on Instagram.
14. As a solo creator, I want to see every slide of my carousel in a preview before publishing, so that I can verify the visual layout and the copy.
15. As a solo creator, I want to edit the copy on any slide inline before publishing, so that I can fix what the AI got wrong without restarting generation.
16. As a solo creator, I want to discard a draft I don't like, so that I'm never forced to publish bad output.
17. As a solo creator, I want approval-by-default on every post — nothing should auto-publish — so that I never wake up to a hallucinated claim under my brand.
18. As a solo creator, I want the system to run a quality review pass (brand voice, factual claims, CTA presence) before showing me the draft, so that I don't waste time on obvious issues.
19. As a solo creator, I want the AI's output to actually sound like me, drawn from the voice samples I provided, so that my followers don't feel something has changed.
20. As a solo creator, I want consistent visual style across the slides of a single carousel, so that the carousel reads as intentional rather than as a stack of mismatched images.
21. As a solo creator, I want my brand colors, fonts, and logo applied automatically across every template slide, so that I never have to re-pick them per slide.
22. As a solo creator, I want to publish an approved carousel to my Instagram with a single click, so that I never have to copy assets to a different app.
23. As a solo creator, I want clear and actionable error messages when publishing fails — rate limits, expired tokens, content rejections — so that I know exactly what to fix.
24. As a solo creator, I want to know the current status of every draft (queued, generating, ready, published, failed), so that I can plan around it.
25. As a small business owner, I want the same workflow as creators, so that I can promote my own products without hiring a marketer.
26. As a small business owner running multiple ventures, I want to manage several brand identities under one user account, so that I don't have to maintain multiple logins.
27. As a customer, I want my Instagram OAuth tokens encrypted at rest, so that my account access is safe even if the database is compromised.
28. As a customer, I want a way to delete my data permanently, so that I can comply with privacy expectations and platform requirements.
29. As a customer, I want to subscribe to the Pro tier via Stripe Checkout, so that I can unlock content generation.
30. As a customer, I want my subscription state to gate content generation directly, so that my billing always matches what I'm using.
31. As a customer, I want predictable pricing — a single tier in the launch — so that I am not making decisions about credit packs or per-unit costs.
32. As an admin, I want a CMS-style admin UI to inspect customers, brands, accounts, and content jobs, so that I can support customers and debug issues.
33. As an admin, I want role-based access (system, admin, customer) so that operational permissions can be delegated safely.
34. As a system role, I want full platform access, so that I can troubleshoot any production issue.
35. As a developer, I want all generation work to run in a separate Python service via Celery, so that the web tier stays responsive and AI failures don't take down the customer UI.
36. As a developer, I want every LLM call to flow through a model-agnostic client, so that I can swap providers (Gemini, OpenAI, Anthropic, Ollama) per pipeline stage via environment configuration.
37. As a developer, I want each agent stage (plan, write, review) to be a separate Celery sub-task, so that I get retry, isolation, and observability per stage.
38. As a developer, I want the slide renderer to live in the Next.js app (Satori), so that templates and the customer UI share one codebase.
39. As a developer, I want all schema changes to flow through Payload migrations, so that production schema is never out of sync with the codebase.
40. As a developer, I want to bring up the entire stack with a single `./scripts/dev.sh up`, so that local development mirrors the existing products project pattern.
41. As a developer, I want a multi-stage Dockerfile per app (dev and prod targets), so that hot-reload dev volumes and production images coexist cleanly.
42. As a developer, I want production deploys to run via GitHub Actions over a WireGuard VPN with an SSH tarball stream — mirroring the products project — so that I have a single mental model across both projects.
43. As a developer, I want a golden-prompt regression suite that runs the planner / writer / reviewer prompts across multiple LLM providers, so that I can detect quality regressions before swapping a model in production.
44. As a developer, I want every generated carousel to record its actual LLM and image-generation cost, so that I can monitor unit economics and alert on drift.
45. As a developer, I want a Celery monitoring UI (Flower) in dev, so that I can see task queues and failures at a glance.
46. As a developer, I want RabbitMQ to be the contract between the web tier and the agents service, so that the two can be deployed and scaled independently.
47. As a customer awaiting my first generation, I want progress feedback (queued / planning / writing / reviewing / ready), so that I'm not left wondering whether the system is alive.
48. As a customer, I want my voice samples retrieved by similarity to the topic of the current draft, so that the AI mimics the right slice of my voice for each post type.
49. As a beta customer, I want my generated carousels to be "publishable as-is at least half the time" — minor edits the rest of the time — so that the time saved is real, not theatrical.

## Implementation Decisions

### Architectural

- The repository is a **monorepo** with two main applications: `apps/web` (Next.js 15 + Payload CMS 3.x, TypeScript) and `apps/agents` (Python 3.12, FastAPI, Celery). The structure mirrors the user's existing products project at `/Users/sorin.dinu/Work/projects/products`.
- The **database** is self-hosted **PostgreSQL 16 with the pgvector extension**, running in Docker. Supabase is explicitly excluded, consistent with the products project's stated direction.
- **Asynchronous jobs** flow through **RabbitMQ + Celery**. The web tier publishes a message after creating a `content-jobs` row; Celery workers in `apps/agents` consume and run the agent pipeline. Payload's built-in jobs runner is used only for CMS-side cron (token refresh, scheduled-publish triggers).
- **Authentication and admin** are provided by Payload CMS, with three roles: `system` (full platform access), `admin` (operational access), `customer` (only their own brands, accounts, and jobs). Access control is enforced via Payload's per-collection access functions.
- **File storage** uses Payload's media collection backed by a local Docker volume in MVP-1. An S3-compatible adapter is deferred until scale demands it.
- **Reverse proxying / TLS** is handled by a pre-existing nginx-proxy-manager stack on the host. SMN attaches to a shared external `proxy-network` Docker network.
- **Deployment** is self-hosted via Docker Compose on a server reachable through WireGuard. A single GitHub Actions workflow streams a gzipped tarball over SSH and triggers a server-side `scripts/deploy.sh` that runs build → `docker compose up` → `pg_dump` backup → `payload migrate` → image prune. Identical pattern to the products project's `deploy-main.yml`.
- The **launch posture** is direct API publishing (no draft-to-mobile fallback, no mobile companion app), gated on Meta App Review approval. **Auto-publishing is off**: every post requires explicit human approval before publication.

### Modules to build (deep modules with stable, testable interfaces)

- **`brands` collection** — owns the brand profile (brief, palette, font, logo, owner). Single source of truth for everything that distinguishes one customer's content from another's.
- **`accounts` collection** — represents a connected social platform account. Owns encrypted OAuth tokens, platform user id, account type. Scoped to a brand.
- **`voice-samples` collection** — corpus of pasted samples and (post-MVP-1) imported posts and approved drafts. Includes a custom vector field with pgvector index for similarity retrieval.
- **`assets` collection** — uploaded brand/product photos with tags. Backed by Payload media uploads.
- **`templates` collection** — registry of the ~15 hand-designed slide templates. Seeded from code, editable by admins.
- **`content-jobs` collection** — request and response payload, status state machine, error capture, scheduling fields, links to brand and account. Single audit trail per generation.
- **`subscriptions` collection** — Stripe sync of customer subscription state. Single tier (Pro) in MVP-1.
- **`media` collection** — Payload built-in upload collection backing logos, assets, and rendered slide PNGs.
- **`LLMClient` interface** (in `apps/agents`) — model-agnostic abstraction with adapters for Gemini, OpenAI, Anthropic, and Ollama. Per-stage provider/model selection via env (`LLM_PLANNER`, `LLM_WRITER`, `LLM_REVIEWER`, with `DEFAULT_LLM_PROVIDER` fallback). Anthropic prompt-caching used under the abstraction where applicable. This is a *deep module*: all higher-level pipeline code depends only on this interface, never directly on a provider SDK.
- **Pipeline orchestrator** (in `apps/agents`) — sequences the agent pipeline: `plan → write → resolve_assets → compose → review`, with at most one revision loop. Each stage is a distinct Celery sub-task. Inputs and outputs are validated Pydantic schemas. This is a *deep module*: callers only request a generation; internally it manages all sub-tasks, retries, and revision logic.
- **Tools layer** (in `apps/agents`) — provider-portable tool implementations: `get_brand_profile`, `get_brand_voice` (pgvector top-K), `get_asset_library`. These are called by the LLM via the `LLMClient` tool interface.
- **Brand-voice retrieval module** — given a brand and a query string, returns the top-K most stylistically similar voice samples by vector similarity. Hides embedding generation, pgvector query construction, and recency weighting (post-MVP-1) behind a single function.
- **Render service** (in `apps/web`) — POST `/api/render` accepts `{ template_id, props }` and returns a PNG (or stores it in media and returns id+URL). React templates live in `apps/web/src/render/templates/`. Brand palette, font, and logo merge with template-specific props.
- **Instagram client** (in `apps/web`) — three responsibilities behind one module: OAuth callback handling with Business/Creator validation, encrypted token storage and refresh, and a thin Graph API wrapper that exposes `publishCarousel(jobId)`. Higher-level code never constructs raw Graph API requests.
- **Stripe integration** — webhook receiver, subscription state synchroniser, paywall middleware that gates `content-jobs` creation on active Pro subscription.
- **Payload hook: `content-jobs.afterCreate`** — publishes the Celery message that kicks off the pipeline. Only the hook knows about RabbitMQ; the rest of Payload doesn't.
- **Token refresh job** (Payload scheduled job) — refreshes Instagram long-lived tokens before expiry across all `accounts` rows.

### Schema decisions

- Hierarchy is `User → Brand → Account` (not `User → Account`). Voice samples, assets, products, and content jobs are scoped to a brand, not a user, because real users (creators, SMB owners) often need separate identities.
- `voice-samples.embedding` is a `vector(1536)` column with an HNSW or IVFFlat index, populated at sample creation time via a single embedding model (`text-embedding-3-small` by default). The embedding is the only place the pgvector dependency is observable from the application layer.
- `content-jobs` carries both `inputPayload` (the original request) and `draftPayload` (the generated draft) as JSON, providing a full audit trail per generation. Status field is a strict enum with explicit transitions: `queued → generating → ready → approved → published`, with `failed` as a terminal branch.
- `accounts.encryptedAccessToken` and `accounts.encryptedRefreshToken` are encrypted with a server-side secret. The Instagram client is the only module that decrypts them.
- `subscriptions.tier` is a single-value enum (`pro`) in MVP-1; the column exists so adding `free` and `power` post-MVP doesn't require a schema change.

### API contracts

- **Customer-facing** — Payload's auto-generated REST API for CRUD on collections, with role-based access enforcement.
- **Web → agents** — small HTTP surface (`/embed`, `/health`) plus RabbitMQ for asynchronous work. The RabbitMQ message contract is the canonical async API; HTTP is for synchronous helpers only.
- **Web internal** — `/api/render` (Satori), `/api/oauth/instagram/callback`, `/api/stripe/webhook`, `/api/data-deletion`.
- **Agents → web** — agents call `/api/render` to produce template PNGs, and Payload's REST API to read/write collection rows during pipeline execution. No direct DB writes from agents to mutating tables; all writes go through Payload (so access control and hooks are honored).

### Specific interactions

- **Brand voice capture in MVP-1** uses a paste-N-samples textarea only. IG-OAuth post-import is deferred to post-MVP-1, as is the continuous-learning loop that ingests approved drafts back into the corpus.
- **Image sources in MVP-1** are limited to two: templated render (Satori) and user-uploaded assets. Stock library, URL scraping, and synthetic image generation are deferred.
- **Affiliate / promo flow** in MVP-1 generates the call-to-action language ("link in bio") but does not manage the bio link itself; bio-link / linktree management is deferred.
- **Cost tracking** — every LLM call and image-gen call reports its cost to the active `content-jobs` row. Average per-carousel cost is monitored; the budget guideline is ≤ $0.30 per carousel.
- **Brand-safety review** — the Editor stage (Reviewer) is a hard gate: if it returns `revise` and the revision budget has been spent, the job goes to `ready` with the issues attached so the customer sees them in the queue UI.

## Testing Decisions

A good test here exercises a module's external behavior — its public interface — and treats internals as opaque. We do not assert on which prompts were sent to which provider, which Celery sub-tasks fired in which order, or how a Satori template's internals are laid out. We assert on outcomes: did the pipeline produce a draft with the expected structure and on-brand copy; did the publisher make the expected sequence of Graph API calls in response to a draft; did the brand-voice retrieval return samples in similarity order. Implementation-detail tests are forbidden — they slow refactors and produce no signal about correctness.

### Modules to test (priority order)

- **`LLMClient` (apps/agents)** — for each configured provider (Gemini, OpenAI, Anthropic, Ollama), given a stable golden prompt and a Pydantic response schema, assert the adapter returns parseable structured output. Tool-use round-trips are tested with a fake tool. Streaming output is tested for completion. This is the *most important* test: it's the boundary between "model agnostic in theory" and "model agnostic in practice."
- **Pipeline orchestrator (apps/agents)** — given a brand + topic and a mocked `LLMClient`, assert the full pipeline produces a `draftPayload` with the expected shape (slide count, slide types, copy fields populated, image references resolved). Test the revision loop: a reviewer that returns `revise` once causes a single rewrite; returning `revise` twice ends the job in `ready` with issues attached.
- **Brand-voice retrieval module** — against a real Postgres + pgvector test database seeded with a known corpus and known query embeddings, assert top-K results are returned in similarity order.
- **Instagram client publish flow (apps/web)** — given a `draftPayload` and a mocked Graph API, assert the publisher issues per-slide media-container POSTs, then a carousel-container POST, then a `media_publish` POST, in that order. Failure cases: rate limit response, expired token, content rejection — assert error captured to `content-jobs.error` and status set to `failed`.
- **Render service (apps/web)** — for ~3 representative templates, snapshot test that POSTing `{ template_id, props }` returns a PNG of the expected dimensions whose pixel data contains the brand palette colors at expected locations. Snapshot tests are visual-regression style, not byte-exact.
- **Access control (apps/web)** — for each collection, assert that a `customer` role can read/write only rows scoped to their brand, and cannot list or read other customers' rows via the Payload REST API. Use Payload's testing harness with seeded users.
- **Subscription gate (apps/web)** — assert that a customer without an active `pro` subscription receives a 4xx when attempting to create a `content-jobs` row.
- **Stripe webhook sync** — given a sample `customer.subscription.updated` payload, assert the `subscriptions` collection row reflects the new state.

### Prior art

The products project at `/Users/sorin.dinu/Work/projects/products` has an `apps/fixtures` integration test data server pattern that we will mirror here for end-to-end tests. The agents service uses `pytest` (with `uv run pytest`); the web service uses Vitest or Jest for collection-level tests. Golden prompt fixtures live in `apps/agents/tests/golden/` and are reviewed with diff tooling on each provider/model swap.

### Tests deferred from MVP-1

- Continuous-learning RAG loop tests (the loop itself is post-MVP-1).
- Bio-link management tests (feature deferred).
- Stock library and URL scraper tests (features deferred).
- TikTok publish flow tests (TikTok deferred).

## Out of Scope

- **TikTok integration** — Photo Mode posting, OAuth, Content Posting API, app review. Deferred to post-MVP-1; TikTok app review timeline runs separately.
- **Reels / video generation** — templated stock-reels (Remotion-based), synthetic video (Veo 3 / Sora / Runway), avatar reels (HeyGen-style). Deferred to v2; brings YouTube Shorts back into platform scope.
- **News-awareness tool** — Tavily/Bing News integration so the planner can riff on recent niche events. Deferred.
- **Continuous-learning RAG loop** — embedding approved drafts back into the brand-voice corpus with recency weighting. Deferred.
- **Bio-link / linktree management** — required for affiliate flows to actually convert; deferred to post-MVP-1.
- **URL scraper for product pages** — Amazon, Shopify, manufacturer-page extraction. Deferred; users paste product details manually in MVP-1.
- **Stock library integration** — Pexels, Unsplash, Shutterstock, Storyblocks. Deferred.
- **Synthetic image generation** — DALL·E, Imagen, Flux, Ideogram via Replicate gateway. Deferred to post-MVP-1.
- **Free tier and Power tier** — pricing expansion. MVP-1 ships Pro only.
- **Multi-brand workspace UI polish** — the data model already supports many brands per customer; the MVP-1 UI emphasizes a single brand.
- **Auto-publish toggle** — only after AI quality is high enough that customers trust unattended publishing.
- **S3-compatible / MinIO storage adapter** — local Docker volume is sufficient for MVP-1.
- **Mobile companion app** — direct API publish removes the need for one in MVP-1.
- **Comment/DM AI responder** — out of MVP-1 and likely out of v2 (high brand-safety risk; pattern overlaps with platform-blocked automation).
- **Agency / enterprise features** — workspaces, RBAC beyond the three roles, SSO, audit logs, white-label reports. Defer until customer demand shifts upmarket.
- **Fully autonomous publishing without human approval** — explicitly excluded; approval-by-default is a brand-safety differentiator.
- **Multi-account farm operation** — explicitly excluded for ToS and ethical reasons; the multi-account-per-user feature is for legitimate individual users running 2–5 of *their own* accounts, not bulk content farming.

## Further Notes

- **Architectural mirroring of the products project is load-bearing.** Two projects sharing one mental model (same `apps/` layout, same `scripts/` patterns, same `docker-compose` topology, same WireGuard-tarball-SSH deploy) is a deliberate operational choice. Diverging would impose ongoing context-switching cost.
- **AI quality is the riskiest unknown.** MVP-1 is intentionally cut to a 4–6 week tracer-bullet scope so that quality is validated on real user brands before time is invested in deferred features. The success criterion: the founder publishes ≥ 50% of generated drafts on their own brand with no edits, the rest with only minor edits.
- **Realistic timeline for solo dev:** 5–7 working weeks to a private beta. Meta App Review wait runs in parallel from Phase 5, typically 3–6 weeks, often with one round of resubmission.
- **Cost target per carousel:** ≤ $0.30 (LLM + image-gen + news lookup). Tracked per `content-jobs` row; alert if average exceeds this.
- **Operational prerequisites that must be in flight by launch:** registered business entity, Meta business verification, privacy policy, terms of service, support email on owned domain, data-deletion endpoint, branded app icon and logo, screencast video demo, GitHub Actions deploy secrets.
- **Issue-tracker publication is pending.** This project does not yet have a configured issue tracker — no GitHub repo, no Linear / Jira / GitHub-Projects, no `needs-triage` label vocabulary. Once a repo is initialised and a tracker is chosen, this PRD should be filed there with the `needs-triage` label, and follow-up issues should be cut for each in-scope item using the `to-issues` skill.
