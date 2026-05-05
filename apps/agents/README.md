# SMN agents service

Python 3.12 + FastAPI + Celery. Owns the AI pipeline (planner / writer / visual director / editor) and async job orchestration via RabbitMQ.

## Layout

```
apps/agents/
├── pyproject.toml
├── Dockerfile          # multi-stage: dev + prod
├── src/
│   └── smn_agents/     # the package — `from smn_agents.X import Y` works after uv sync
│       ├── __init__.py
│       ├── main.py        # FastAPI app
│       ├── celery_app.py  # Celery instance
│       └── tasks.py       # Celery tasks
└── tests/
    └── test_health.py
```

`uv sync` installs `smn_agents` as an editable install in the venv (PHP/Composer equivalent: `composer install` + PSR-4 autoload mapping `Smn\\Agents\\` → `src/`). After that, all imports are absolute: `from smn_agents.celery_app import celery_app` — no PYTHONPATH or symlink hacks.

## Local commands (when `uv` is installed locally)

```bash
uv sync                                                       # creates .venv + installs deps + project
uv run uvicorn smn_agents.main:app --reload --port 8001       # FastAPI dev server
uv run celery -A smn_agents.celery_app worker --loglevel=info # Celery worker
uv run celery -A smn_agents.celery_app flower --port=5555     # Flower monitoring UI
uv run pytest                                                 # tests
uv run ruff check .                                           # lint
```

Install `uv` with `brew install uv` (macOS) or `curl -LsSf https://astral.sh/uv/install.sh | sh` (Linux).

In normal dev, run via Docker (`./scripts/dev.sh up agents`) — `uv` is installed inside the container.
