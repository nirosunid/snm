# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SMN — a SaaS where customers connect Instagram (Business / Creator) accounts and AI agents draft on-brand carousel posts for human approval before publishing. Greenfield project, currently in MVP-1 scaffolding (Issue #1 done).

Three planning artifacts in `docs/plans/` are load-bearing context — read these before any non-trivial work:
- `social-media-saas-mvp-1.md` — the plan: scope, architecture, build sequence, file map, verification.
- `social-media-saas-prd.md` — PRD with 49 user stories, module/test decisions, out-of-scope list.
- `social-media-saas-issues.md` — 19 vertical-slice issues, dependency-ordered. Issue #1 is done; #2 onwards are the work queue.

## Architecture is mirrored from a sibling project

The repo structure, Docker layout, scripts, and deploy pipeline are deliberately modelled on `/Users/sorin.dinu/Work/projects/products` — same directory shape (`apps/`, `database/`, `scripts/`), same compose split (base + `.dev.yml` + `.prod.yml` + `database/` includes), same `scripts/dev.sh` / `prod.sh` / `deploy.sh` pattern, same WireGuard-SSH-tarball deploy via GitHub Actions. When patterns are unclear here, look at `products/` for prior art — but check before copying since SMN diverges in a few specific places (see "Resolved decisions" below).

## Resolved decisions (do not re-grill)

These were debated, decided, and locked. Don't re-litigate without explicit user instruction:

- **No Supabase, no Vercel, no Inngest, no Clerk.** Stack is self-hosted: Postgres + pgvector in Docker, Payload CMS for auth/admin/REST/GraphQL, RabbitMQ + Celery for jobs, Docker Compose for both dev and prod. `products/`'s README states "No Supabase dependency in the target architecture" — same applies here.
- **LangChain, not direct SDKs.** `apps/agents` uses `langchain`, `langgraph`, `langchain-{anthropic,google-genai,openai,ollama}`, `langsmith`. The plan originally said "no LangChain" — that was overridden when the user picked "Full adopt of products architecture."
- **Approval-by-default.** Auto-publish is OFF in MVP-1. Brand-safety differentiator. Don't add an auto-publish toggle without explicit ask.
- **MVP-1 is Instagram only.** TikTok is in the plan but deferred to post-MVP-1 (Issue #4 in roadmap order).
- **Image sources MVP-1: templates + uploaded assets only.** No URL scraper, no stock library, no synthetic image gen until later issues.
- **Default LLM = `ollama` / `llama3.2`** for zero-key first-run boot. Override via `LLM_WRITER_PROVIDER=anthropic` etc. for quality validation.
- **Embedding model: OpenAI `text-embedding-3-small`, 1536 dimensions, locked in schema.** Requires `OPENAI_API_KEY` even when LLM uses Ollama. Changing the dimension means a coordinated migration + full re-embed.
- **Roles: `system` / `admin` / `customer`.** Mirrored from products. Customer-scoped access enforced per-collection via Payload `access` functions.
- **`User → Brand → Account` hierarchy.** Voice samples, assets, products, and content jobs are scoped to a *brand*, not a user. Multi-brand-per-user (E1) is in the data model.
- **Drop "faceless content farm" use cases (E2).** Explicitly out of scope — pollutes platform-tooling fingerprint, ToS-hostile, hurts everyone else.

## Stack

- `apps/web` — Next.js 15 + Payload CMS 3.x (TypeScript). Customer UI, Payload admin at `/admin`, REST/GraphQL APIs, Stripe billing, IG OAuth + Graph API publish, Satori slide renderer.
- `apps/agents` — Python 3.12 + FastAPI + Celery. AI pipeline (planner / writer / visual director / editor) with multi-provider LLM client.
- `postgres` (`pgvector/pgvector:pg16`) — primary DB; brand-voice RAG via pgvector.
- `rabbitmq` — async messaging between web tier and Celery workers.
- Reverse proxy in production: external `nginx-proxy-manager` stack on the same host. The `web` service attaches to both `smn-network` (internal) and `proxy-network` (external — must be created once on the host with `docker network create proxy-network`).

## Common commands

All dev runs through Docker — Docker Desktop or OrbStack required. Local `pnpm` / `uv` are only needed for IDE support and fast type-checks.

### Rule: every Docker command goes through `scripts/`

Never run `docker compose -f docker-compose.yml -f docker-compose.{dev,prod}.yml ...` directly — neither in shell suggestions, in CI, nor in documentation. The wrappers below encapsulate the multi-file compose flags and shared workflows. If a needed command isn't a subcommand yet, **add one to `scripts/dev.sh` and `scripts/prod.sh`** rather than reaching for raw `docker compose`. The only place raw `docker compose` lives is *inside* the script source files.

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

Endpoints when up: `localhost:3000` (Next.js), `localhost:3000/admin` (Payload admin), `localhost:8001/docs` (FastAPI Swagger), `localhost:5555` (Flower / Celery), `localhost:15672` (RabbitMQ management).

### Prod stack
Mirrors dev with `prod.sh`; runs detached (`-d`). Same subcommand surface (`up`, `start`, `restart`, `down`, `stop`, `logs`, `migrate`, `import-map`, `generate-types`, `exec`, `config`, `backup-db`, `restore-db`).
```bash
./scripts/prod.sh up
./scripts/prod.sh migrate
./scripts/prod.sh backup-db
```

### Web (apps/web — Next.js + Payload)
```bash
cd apps/web
pnpm install                         # only if node_modules missing
pnpm dev                             # dev server (only useful when not using Docker)
pnpm build
pnpm lint
pnpm exec tsc --noEmit               # type-check
pnpm payload migrate                 # run migrations against current DATABASE_URL
pnpm payload migrate:create <name>   # scaffold a new migration file
pnpm generate:types                  # write src/payload-types.ts (after collection schema change)
pnpm generate:importmap              # write src/app/(payload)/admin/importMap.js (after admin component change)
```

### Agents (apps/agents — Python FastAPI + Celery)
```bash
cd apps/agents
uv sync                                                       # install deps + smn_agents (editable)
uv run uvicorn smn_agents.main:app --reload --port 8001       # FastAPI dev server
uv run celery -A smn_agents.celery_app worker --loglevel=info # Celery worker
uv run celery -A smn_agents.celery_app flower --port=5555     # Flower UI
uv run pytest                                                 # all tests
uv run pytest tests/test_health.py::test_health -v            # single test
uv run ruff check .
uv run mypy src
```

`uv` install: `brew install uv` (macOS) or `curl -LsSf https://astral.sh/uv/install.sh | sh` (Linux).

### Validating without booting Docker
```bash
./scripts/dev.sh config                                                    # verify merged compose parses
python3 -c "import tomllib; tomllib.loads(open('apps/agents/pyproject.toml').read())"
cd apps/web && pnpm exec tsc --noEmit && pnpm lint
```

## Architectural notes (the non-obvious parts)

### `apps/web` route groups
- `app/(frontend)/` — public/customer-facing pages (`/`, `/dashboard`, `/brands/*`).
- `app/(payload)/` — Payload-owned routes (admin UI at `/admin`, REST at `/api/[...slug]`, GraphQL at `/api/graphql`). The files in `(payload)/admin/` and `(payload)/api/` are largely scaffolded by Payload conventions — touch carefully.
- `app/(legal)/` — `/privacy` and `/terms` (need real content before Meta App Review).

### `apps/web` Payload conventions
- Collections live in `src/collections/`. Each collection's `access` block enforces role-based scoping (`customer` sees only `brand.owner == req.user`; `admin`/`system` see all).
- Schema changes flow through Payload migrations in `src/migrations/` — never rely on `db.push()` in production. Each migration must register in `src/migrations/index.ts`. Use `IF EXISTS` / `IF NOT EXISTS` guards in raw SQL.
- After any collection schema change: `./scripts/dev.sh generate-types` (regenerates `src/payload-types.ts`). After any admin custom component change OR after first install with empty importMap: `./scripts/dev.sh import-map` (regenerates `src/app/(payload)/admin/importMap.js`). Both must run inside the web container — the script does that for you.
- The `vector(1536)` column on `voice-samples.embedding` requires Drizzle-level customization on Payload's postgres adapter — handled in Issue #5.

### `apps/agents` Python package layout
- `src/smn_agents/` is *the* package. `pyproject.toml` declares `[tool.setuptools.packages.find] where = ["src"]`. After `uv sync`, `from smn_agents.celery_app import celery_app` works anywhere — no PYTHONPATH, no symlink hacks. PHP/Composer equivalent: PSR-4 mapping `Smn\\Agents\\` → `src/`.
- Dockerfile uses two-stage uv install: dependencies first (cached), then the local project as editable. Never re-introduce a `RUN ln -s /app/src /app/agents` workaround.
- LLM access goes through a model-agnostic `LLMClient` interface backed by LangChain's `BaseChatModel` (see `products/apps/agents/src/services/llm.py` for the factory shape that should be ported in Issue #8).
- The agent pipeline (Issue #9) is a LangGraph `StateGraph` with conditional edges for the at-most-one revision loop. Each stage is a separate Celery sub-task for retry/observability.
- Tools called by the LLM: `get_brand_profile`, `get_brand_voice` (pgvector top-K), `get_asset_library`. Provider-portable.

### Docker compose layout
- `docker-compose.yml` is the base. `include:` directives at the top pull in `database/docker-compose.db.yml` (postgres+pgvector) and `database/docker-compose.queue.yml` (rabbitmq).
- `docker-compose.dev.yml` and `.prod.yml` are overrides; they each `include:` the matching `database/docker-compose.db.{dev,prod}.yml` (port mapping differences).
- Multi-stage Dockerfiles use `target: dev` and `target: prod` selected per environment.
- Container names: `smn-postgres`, `smn-rabbitmq`, `smn-web`, `smn-agents`, `smn-celery-worker`, `smn-flower`.

### Inter-service contracts
- Web → Agents: small HTTP surface (`/embed`, `/health`) plus RabbitMQ for async work. The RabbitMQ message contract is the canonical async API.
- Agents → Web: agents call `apps/web /api/render` (Satori PNG renderer) and the Payload REST API for collection reads/writes. **All mutating writes go through Payload, never direct DB writes** — so access control and hooks are honored.

### Per-stage LLM model overrides
Three env strings let any pipeline stage independently pick a model: `LLM_PLANNER_PROVIDER` / `LLM_PLANNER_MODEL`, same for `LLM_WRITER_*` and `LLM_REVIEWER_*`. Falls back to `DEFAULT_LLM_PROVIDER` / `DEFAULT_LLM_MODEL`. Recommended for the founder's quality validation: cheap planner (Gemini Flash), real writer (Claude Sonnet), real reviewer (Claude Sonnet).

### Production deploy
GitHub Actions workflow `.github/workflows/deploy-main.yml` does WireGuard install → SSH key setup → write `.env` from `PRODUCTION_ENV` secret → stream a gzipped source tarball over SSH (forced-command on server runs `scripts/deploy.sh`). Server-side `deploy.sh`: rebuild → `docker compose up -d` → backup → migrate → image prune. Required GitHub secrets: `WG_PRIVATE_KEY`, `WG_SERVER_PUBLIC_KEY`, `WG_ENDPOINT`, `DEPLOY_SSH_KEY`, `DEPLOY_USER`, `PRODUCTION_ENV`.

## Things that don't yet exist (don't assume)

- No `uv.lock` yet (commit after first `uv sync`). The Dockerfile tolerates absence via `uv.lock*` glob + `|| uv sync` fallback.
- No real Payload collections beyond `Users` and `Media` — `Brands`, `Accounts`, `VoiceSamples`, `Assets`, `Templates`, `ContentJobs`, `Subscriptions` land in Issue #2 / #4 / #5 etc.
- No issue tracker configured. PRD and issues are markdown in `docs/plans/`. If/when a tracker is set up, file the PRD as the parent issue and the 19 slices as children with `needs-triage` labels.
- No `proxy-network` Docker network created yet. Run `docker network create proxy-network` once on any host that will run the prod stack.
- No real `.env` configured for first run. Copy `.env.example` and at minimum set `OPENAI_API_KEY` (required for embeddings even when LLM is Ollama).
