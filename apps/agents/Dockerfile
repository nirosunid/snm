# SMN agents service image (Python 3.12 + FastAPI + Celery).
# Multi-stage: dev (autoreload) and prod (no reload).
#
# Layout: src/smn_agents/ is the package. `uv sync` installs it as an editable
# install in the venv; from then on `from smn_agents.X import Y` works
# anywhere (FastAPI, Celery, pytest) with no PYTHONPATH or symlink hacks.

FROM python:3.12-slim AS base

WORKDIR /app

# Install uv for fast dependency management.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Step 1: install dependencies only (no project) for max cache reuse.
# Changes to src/ won't bust the dependency cache.
COPY pyproject.toml uv.lock* ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project 2>/dev/null \
    || uv sync --no-install-project

# `dev` carries source + project install + autoreload.
FROM base AS dev

COPY src ./src
COPY tests ./tests

# Step 2: install the local project (smn_agents) as editable.
# Quick (just registers the .pth pointer) since deps are already cached.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen 2>/dev/null || uv sync

EXPOSE 8001

ENV LOG_LEVEL=DEBUG

CMD ["uv", "run", "uvicorn", "smn_agents.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]

# `prod` is the runtime image (no tests, no reload).
FROM base AS prod

COPY src ./src

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen 2>/dev/null || uv sync

ENV PYTHONUNBUFFERED=1

EXPOSE 8001

CMD ["uv", "run", "uvicorn", "smn_agents.main:app", "--host", "0.0.0.0", "--port", "8001"]
