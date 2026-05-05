# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SMN — a SaaS where customers connect Instagram (Business / Creator) accounts and AI agents draft on-brand carousel posts for human approval before publishing. Greenfield project, currently in MVP-1 scaffolding. Issues #1 (foundation), #2 (tracer-bullet generate → render), and #3 (signup + roles + access control) are done. Issue #4 (Brands collection + brand-creation UI) is the next slice.

Three planning artifacts in `docs/plans/` are load-bearing context — read these before any non-trivial work:
- `social-media-saas-mvp-1.md` — the plan: scope, architecture, build sequence, file map, verification.
- `social-media-saas-prd.md` — PRD with 49 user stories, module/test decisions, out-of-scope list.
- `social-media-saas-issues.md` — 19 vertical-slice issues, dependency-ordered. Issue #1 is done; #2 onwards are the work queue.

## Architecture is mirrored from a sibling project

The repo structure, Docker layout, scripts, and deploy pipeline are deliberately modelled on `/Users/sorin.dinu/Work/projects/products` — same directory shape (`apps/`, `database/`, `scripts/`), same compose split (base + `.dev.yml` + `.prod.yml` + `database/` includes), same `scripts/dev.sh` / `prod.sh` / `deploy.sh` pattern, same WireGuard-SSH-tarball deploy via GitHub Actions. When patterns are unclear here, look at `products/` for prior art — but check before copying since SMN diverges in a few specific places (see "Resolved decisions" below).

## Resolved decisions (do not re-grill)

These were debated, decided, and locked. Don't re-litigate without explicit user instruction:

- **No Supabase, no Vercel, no Inngest, no Clerk.** Stack is self-hosted: Postgres + pgvector in Docker, Payload CMS for auth/admin/REST/GraphQL, Docker Compose for both dev and prod. `products/`'s README states "No Supabase dependency in the target architecture" — same applies here.
- **Agent pipeline lives in `apps/web` TypeScript, not Python.** Switched away from `apps/agents` Python + LangChain + Celery in MVP-1. The pipeline uses **Vercel AI SDK + Zod** for structured output, with provider packages `@ai-sdk/{anthropic,google,openai}` and `ollama-ai-provider`. Code lives under `apps/web/src/lib/agents/`. The Python `apps/agents` service, RabbitMQ, Celery, and Flower are still in the compose file but are deferred — no slice currently writes Python or routes through them. Don't add new Python pipeline code; if a Python-edge feature surfaces (e.g., background removal), revisit then.
- **Customer-facing routes are prefixed with `/customer`.** Pages under `app/(frontend)/customer/...` (URL `/customer/...`); customer-callable APIs under `app/(frontend)/api/customer/...` (URL `/api/customer/...`). Public/marketing/legal pages stay at the root. Payload's `/admin` and `/api/[...slug]`/`/api/graphql*` are unprefixed and Payload-owned.
- **Approval-by-default.** Auto-publish is OFF in MVP-1. Brand-safety differentiator. Don't add an auto-publish toggle without explicit ask.
- **MVP-1 is Instagram only.** TikTok is in the plan but deferred to post-MVP-1 (Issue #4 in roadmap order).
- **Image sources MVP-1: templates + uploaded assets only.** No URL scraper, no stock library, no synthetic image gen until later issues.
- **Default LLM = `ollama` / `llama3.2`** for zero-key first-run boot. Override via `LLM_WRITER_PROVIDER=anthropic` etc. for quality validation.
- **Embedding model: OpenAI `text-embedding-3-small`, 1536 dimensions, locked in schema.** Requires `OPENAI_API_KEY` even when LLM uses Ollama. Changing the dimension means a coordinated migration + full re-embed.
- **Roles: `system` / `admin` / `customer`.** Mirrored from products. Customer-scoped access enforced per-collection via Payload `access` functions.
- **`User → Brand → Account` hierarchy.** Voice samples, assets, products, and content jobs are scoped to a *brand*, not a user. Multi-brand-per-user (E1) is in the data model.
- **Drop "faceless content farm" use cases (E2).** Explicitly out of scope — pollutes platform-tooling fingerprint, ToS-hostile, hurts everyone else.

## Stack

- `apps/web` — Next.js 15 + Payload CMS 3.x (TypeScript). Customer UI, Payload admin at `/admin`, REST/GraphQL APIs, Stripe billing, IG OAuth + Graph API publish, Satori slide renderer, **and the AI agent pipeline** (Vercel AI SDK + Zod under `src/lib/agents/`).
- `apps/agents` — Python 3.12 + FastAPI shell. **Deferred** — the pipeline now lives in `apps/web` TS. Service is still in compose for compose-cleanliness; no new code here without explicit ask.
- `postgres` (`pgvector/pgvector:pg16`) — primary DB; brand-voice RAG via pgvector.
- `rabbitmq` / `celery-worker` / `flower` — **deferred** alongside `apps/agents`. Still in compose; no async pipeline currently uses them. The MVP-1 generate flow is synchronous (sub-10s round-trip), gated by approval-by-default.
- Reverse proxy in production: external `nginx-proxy-manager` stack on the same host. The `web` service attaches to both `smn-network` (internal) and `proxy-network` (external — must be created once on the host with `docker network create proxy-network`).

## Common commands

All dev runs through Docker — Docker Desktop or OrbStack required. Local `pnpm` / `uv` are only needed for IDE support and fast type-checks.

### Rule: every Docker command goes through `scripts/` AND every command runs in containers

Two rules, same spirit:

1. **All `docker compose` invocations go through the wrappers.** Never run `docker compose -f docker-compose.yml -f docker-compose.{dev,prod}.yml ...` directly — neither in shell suggestions, in CI, nor in documentation. If a needed command isn't a subcommand yet, **add one to `scripts/dev.sh` and `scripts/prod.sh`** rather than reaching for raw `docker compose`. The only place raw `docker compose` lives is *inside* the script source files.
2. **Build / install / lint / type-check / test commands run inside the containers, not on the host.** Use `./scripts/dev.sh exec web <cmd>` (e.g. `pnpm install`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm payload migrate`) and `./scripts/dev.sh exec agents <cmd>` for the Python service. Host Node/pnpm/Python versions, env, and network hostnames diverge from the containerized runtime — running on the host gives misleading green/red signals and can pollute `apps/web/node_modules` with host-resolved paths. The host's `pnpm`, `uv`, and `python3` should only be used for fast IDE-side diagnostics.

> Gotcha: `apps/web`'s dev compose mounts only `src/`, `next.config.mjs`, `postcss.config.mjs`, and `tsconfig.json` from the host — `package.json` and `node_modules` are baked into the image. Adding a new dep means **rebuild** (`./scripts/dev.sh up web`), not just `pnpm install` inside the running container.

### Dev stack
```bash
cp .env.example .env                       # first-time only; edit at minimum OPENAI_API_KEY
./scripts/dev.sh up                        # build and start full stack (foreground)
./scripts/dev.sh up web                    # only one service
./scripts/dev.sh start                     # start already-built services
./scripts/dev.sh logs web                  # follow logs
./scripts/dev.sh stop web
./scripts/dev.sh restart web
./scripts/dev.sh down                      # stop and remove
./scripts/dev.sh migrate                   # run Payload migrations
./scripts/dev.sh import-map                # regenerate Payload admin importMap
./scripts/dev.sh generate-types            # regenerate Payload TS types
./scripts/dev.sh exec web sh               # arbitrary command inside a running service
./scripts/dev.sh config                    # validate merged compose config (parse only)
./scripts/dev.sh backup-db
./scripts/dev.sh restore-db <file>
```

Endpoints when up: `localhost:3000` (Next.js), `localhost:3000/admin` (Payload admin), `localhost:3000/customer/generate` (tracer-bullet generate playground), `localhost:8001/docs` (FastAPI shell — deferred), `localhost:5555` (Flower / Celery — deferred), `localhost:15672` (RabbitMQ management — deferred).

### Prod stack
Mirrors dev with `prod.sh`; runs detached (`-d`). Same subcommand surface (`up`, `start`, `restart`, `down`, `stop`, `logs`, `migrate`, `import-map`, `generate-types`, `exec`, `config`, `backup-db`, `restore-db`).
```bash
./scripts/prod.sh up
./scripts/prod.sh migrate
./scripts/prod.sh backup-db
```

### Web (apps/web — Next.js + Payload + agent pipeline)

All commands run **inside the container** via `./scripts/dev.sh exec web <cmd>`:
```bash
./scripts/dev.sh exec web pnpm install            # only after a package.json change (then rebuild image — see gotcha above)
./scripts/dev.sh exec web pnpm exec tsc --noEmit  # type-check
./scripts/dev.sh exec web pnpm lint               # ESLint
./scripts/dev.sh exec web pnpm build              # production build
./scripts/dev.sh migrate                          # Payload migrations (script subcommand)
./scripts/dev.sh exec web pnpm payload migrate:create <name>
./scripts/dev.sh generate-types                   # write src/payload-types.ts (after collection schema change)
./scripts/dev.sh import-map                       # write src/app/(payload)/admin/importMap.js (after admin component change)
```

Stale-build gotcha: if `tsc` reports modules missing or imports from deleted routes, clear Next's cached type stubs:
```bash
./scripts/dev.sh exec web sh -c 'rm -rf /app/.next/types && pnpm exec tsc --noEmit'
```

### Agents (apps/agents — Python FastAPI shell, deferred)
The Python service is in compose but no MVP-1 slice currently writes Python. The directory still has a FastAPI shell + `/health`. If a Python-edge feature lands later:
```bash
./scripts/dev.sh exec agents uv run pytest
./scripts/dev.sh exec agents uv run ruff check .
./scripts/dev.sh exec agents uv run mypy src
```

### Validating without booting Docker
```bash
./scripts/dev.sh config            # verify merged compose parses
```
Anything heavier (lint/typecheck/test) requires the container — see "every command runs in containers" above.

## Architectural notes (the non-obvious parts)

### `apps/web` route groups
- `app/(frontend)/` — Next.js-owned route group; everything customer-facing or marketing lives here.
  - `app/(frontend)/page.tsx` etc. — public/marketing pages at the root URL (`/`).
  - **`app/(frontend)/customer/...`** — customer-only pages, URL-prefixed `/customer/...`. New customer pages MUST go here, not at the root.
  - **`app/(frontend)/api/customer/...`** — customer-callable API routes, URL-prefixed `/api/customer/...`. New customer APIs MUST go here. Examples in MVP-1: `/api/customer/generate` (LLM call → DraftPayload), `/api/customer/render` (Satori PNG of one slide).
- `app/(payload)/` — Payload-owned routes (admin UI at `/admin`, REST at `/api/[...slug]`, GraphQL at `/api/graphql`). The files in `(payload)/admin/` and `(payload)/api/` are largely scaffolded by Payload conventions — touch carefully. Customer-callable routes under `/api/customer/...` take precedence over the catchall because they're more specific.
- `app/(legal)/` — `/privacy` and `/terms` (need real content before Meta App Review).

### `apps/web` Payload conventions
- Collections live in `src/collections/`. Each collection's `access` block enforces role-based scoping (`customer` sees only `brand.owner == req.user`; `admin`/`system` see all).
- Schema changes flow through Payload migrations in `src/migrations/` — never rely on `db.push()` in production. Each migration must register in `src/migrations/index.ts`. Use `IF EXISTS` / `IF NOT EXISTS` guards in raw SQL.
- After any collection schema change: `./scripts/dev.sh generate-types` (regenerates `src/payload-types.ts`). After any admin custom component change OR after first install with empty importMap: `./scripts/dev.sh import-map` (regenerates `src/app/(payload)/admin/importMap.js`). Both must run inside the web container — the script does that for you.
- The `vector(1536)` column on `voice-samples.embedding` requires Drizzle-level customization on Payload's postgres adapter — handled in Issue #5.

### `apps/web` agent pipeline (TS, Vercel AI SDK + Zod)
- Code lives under `src/lib/agents/`:
  - `schemas.ts` — Zod schemas for the structured-output payload (`Slide`, `DraftPayload`, `GenerateRequest`, `GenerateResponse`).
  - `brand.ts` — hardcoded brand brief (replaced in Issue #4 by reads from the `brands` Payload collection).
  - `llm.ts` — model-agnostic provider factory: `getLanguageModel(stage?)` resolves provider/model from env (`DEFAULT_LLM_*` and per-stage `LLM_PLANNER_*` / `LLM_WRITER_*` / `LLM_REVIEWER_*`) and returns a Vercel AI SDK `LanguageModelV1`. Supports `anthropic`, `google`, `openai`, `ollama`. Auto-appends `/api` to `OLLAMA_BASE_URL` when missing.
  - `generate.ts` — single-LLM-call orchestration with `generateObject({ mode: "json", schema: DraftPayloadSchema, ... })`. The `mode: "json"` is load-bearing for small Ollama models — without it `auto` picks tool-calling, which 3B-class models fail at.
- `app/(frontend)/api/customer/generate/route.ts` (Node runtime) calls `generateDraft(topic)`.
- `app/(frontend)/api/customer/render/route.tsx` (Edge runtime) returns a 1080×1080 PNG via `next/og` `ImageResponse`. **Satori CSS is restrictive** — only `display: flex | block | none | -webkit-box`; every element with multiple children needs `display: flex`; `display: inline-block` is rejected.
- Multi-stage pipeline (planner → writer → visual director → editor) is a later issue. MVP-1 tracer is one-LLM-call sync.

### Docker compose layout
- `docker-compose.yml` is the base. `include:` directives at the top pull in `database/docker-compose.db.yml` (postgres+pgvector) and `database/docker-compose.queue.yml` (rabbitmq).
- `docker-compose.dev.yml` and `.prod.yml` are overrides; they each `include:` the matching `database/docker-compose.db.{dev,prod}.yml` (port mapping differences).
- Multi-stage Dockerfiles use `target: dev` and `target: prod` selected per environment.
- Container names: `smn-postgres`, `smn-rabbitmq`, `smn-web`, `smn-agents`, `smn-celery-worker`, `smn-flower`.

### Inter-service contracts (current)
The pipeline is single-process inside `apps/web` for MVP-1. No web↔agents network call. If/when async work returns:
- Web ↔ Agents (when reactivated): HTTP for thin synchronous calls (`/embed`, `/health`); message bus for long-running work (RabbitMQ stub still in compose).
- Anything that mutates customer-owned data **must go through the Payload Local API or REST** (never direct DB writes) so access control and hooks are honored.

### Per-stage LLM model overrides
Three env strings let any pipeline stage independently pick a model: `LLM_PLANNER_PROVIDER` / `LLM_PLANNER_MODEL`, same for `LLM_WRITER_*` and `LLM_REVIEWER_*`. Falls back to `DEFAULT_LLM_PROVIDER` / `DEFAULT_LLM_MODEL`. Recommended for the founder's quality validation: cheap planner (Gemini Flash), real writer (Claude Sonnet), real reviewer (Claude Sonnet).

### Production deploy
GitHub Actions workflow `.github/workflows/deploy-main.yml` does WireGuard install → SSH key setup → write `.env` from `PRODUCTION_ENV` secret → stream a gzipped source tarball over SSH (forced-command on server runs `scripts/deploy.sh`). Server-side `deploy.sh`: rebuild → `docker compose up -d` → backup → migrate → image prune. Required GitHub secrets: `WG_PRIVATE_KEY`, `WG_SERVER_PUBLIC_KEY`, `WG_ENDPOINT`, `DEPLOY_SSH_KEY`, `DEPLOY_USER`, `PRODUCTION_ENV`.

## Working with Claude Code in this repo

Three places to put notes Claude Code reads. Pick by audience and lifetime:

| File / folder | Gitignored? | Auto-loaded? | When to use |
|---|---|---|---|
| `CLAUDE.md` (this file) | No (committed) | Yes | Anything teammates need: architecture, conventions, gotchas. |
| `CLAUDE.local.md` (repo root) | Yes | Yes | Short personal context for this checkout: current focus, in-flight thinking, personal prefs. Each dev keeps their own. |
| `.claude/local/<topic>.md` | Yes | No | Longer personal threads. Reference from `CLAUDE.local.md` only when you want them in context. |

Other paths under `.claude/` (`settings.json`, `agents/`, `skills/`, `hooks/`) are **not** gitignored — they're for **team-shared Claude Code project configuration** when we add it. Only `.claude/local/` is gitignored. The selective gitignore lets shared and personal config coexist in one folder cleanly.

Rule of thumb: if a note helps teammates, put it in `CLAUDE.md`. If it's personal and short, `CLAUDE.local.md`. If it's personal and long, `.claude/local/<topic>.md`.

## Things that don't yet exist (don't assume)

- No real Payload collections beyond `Users` and `Media` — `Brands`, `Accounts`, `VoiceSamples`, `Assets`, `Templates`, `ContentJobs`, `Subscriptions` land in Issue #4 / #5+.
- The `users` collection has a `role` enum (`system` / `admin` / `customer`, default `customer`). Reusable access primitives live in `src/access/` and mirror the layout in `products/apps/cms/src/access/`. New collections that are scoped per-customer should use `adminOrCustomerOwner` / `customerOwner` (which key off an `owner` relation field).
- No issue tracker configured. PRD and issues are markdown in `docs/plans/`. If/when a tracker is set up, file the PRD as the parent issue and the 19 slices as children with `needs-triage` labels.
- No `proxy-network` Docker network created yet. Run `docker network create proxy-network` once on any host that will run the prod stack.
- No `uv.lock` yet (would only matter if `apps/agents` Python is reactivated).
