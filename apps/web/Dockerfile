# SMN web (Next.js 15 + Payload CMS 3.x) image.
# Multi-stage build: dev (with autoreload) and prod (built artifacts).

FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Install dependencies first for caching.
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# `app` carries the source tree + shared runtime envs.
FROM base AS app

ARG PAYLOAD_SECRET=dev-payload-secret-key-change-in-production-at-least-32-chars
ARG PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ARG AGENT_SERVICE_URL=http://agents:8001
ARG DATABASE_URL=postgresql://smn:smn@postgres:5432/smn

ENV PAYLOAD_SECRET=$PAYLOAD_SECRET
ENV PAYLOAD_PUBLIC_SERVER_URL=$PAYLOAD_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
ENV AGENT_SERVICE_URL=$AGENT_SERVICE_URL
ENV DATABASE_URL=$DATABASE_URL

COPY . .

# `dev` runs Next.js dev server with autoreload.
FROM app AS dev
EXPOSE 3000
CMD ["pnpm", "dev"]

# `build` produces the production Next.js artifacts.
FROM app AS build
RUN pnpm build

# `prod` is the runtime image.
FROM node:20-alpine AS prod
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["pnpm", "start"]
