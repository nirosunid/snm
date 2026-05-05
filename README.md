# SMN — Social Media Manager SaaS

AI-assisted social media manager: customers connect Instagram (Business / Creator) accounts, define brand voice + assets, and let AI agents draft on-brand carousels for human approval before publishing.

> **Status:** MVP-1 scaffolding (Issue #1). Pre-launch; not yet feature-complete.

## Architecture

- `apps/web` — Next.js 15 + Payload CMS 3.x (TypeScript). Customer UI, admin panel at `/admin`, REST/GraphQL APIs, Satori slide renderer, Stripe billing, Instagram OAuth + Graph API publish.
- `apps/agents` — Python 3.12 + FastAPI + Celery. AI agent pipeline (planner / writer / visual director / editor) with multi-provider LLM client (Gemini / OpenAI / Anthropic / Ollama). Async via RabbitMQ.
- `PostgreSQL` + `pgvector` — primary database, brand-voice RAG via vector similarity.
- `RabbitMQ` — async messaging between web tier and Celery workers.

## Quick start

```bash
# 1. Copy environment variables
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY (or whichever LLM provider you'll use)
# and an EMBEDDING-provider key (OPENAI_API_KEY for the default text-embedding-3-small).

# 2. Boot the dev stack
./scripts/dev.sh up
```

Local endpoints:

| Service | URL |
|---|---|
| Customer UI (Next.js) | http://localhost:3000 |
| Payload admin | http://localhost:3000/admin |
| Agents service (Swagger) | http://localhost:8001/docs |
| Celery Flower | http://localhost:5555 |
| RabbitMQ management | http://localhost:15672 |

## Scripts

```bash
./scripts/dev.sh up                  # Build and start full dev stack
./scripts/dev.sh up web              # Build and start only the web service
./scripts/dev.sh start               # Start already-built services
./scripts/dev.sh build web           # Rebuild a single service image
./scripts/dev.sh logs web            # Follow logs
./scripts/dev.sh stop web            # Stop a single service
./scripts/dev.sh down                # Stop and remove the full dev stack
./scripts/dev.sh migrate             # Run pending Payload migrations

./scripts/prod.sh up                 # Build and start full prod stack (-d)
./scripts/prod.sh migrate
./scripts/prod.sh backup-db
./scripts/prod.sh restore-db <file>
```

## Planning artifacts

- [docs/plans/social-media-saas-mvp-1.md](docs/plans/social-media-saas-mvp-1.md) — full plan
- [docs/plans/social-media-saas-prd.md](docs/plans/social-media-saas-prd.md) — PRD
- [docs/plans/social-media-saas-issues.md](docs/plans/social-media-saas-issues.md) — 19 vertical-slice issues for MVP-1
