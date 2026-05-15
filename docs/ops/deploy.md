# Production deploy

How code goes from a `main` push to the live SMN host. Read this once when
setting up a new server, and whenever the workflow needs reasoning about.

## At a glance

```
push main / dispatch
  └─→ .github/workflows/deploy-main.yml (GitHub Actions, ubuntu-latest)
        ├─ install + start WireGuard (10.20.20.0/24)
        ├─ load DEPLOY_SSH_KEY into ~/.ssh
        ├─ write .env from PRODUCTION_ENV secret
        └─ tar -czf - <repo, minus excludes> | ssh deploy-user@10.20.20.1
              └─→ forced-command on the server: tar -xzf - && ./scripts/deploy.sh
                    ├─ ./scripts/prod.sh build  web agents celery-worker flower
                    ├─ ./scripts/prod.sh start  web agents celery-worker flower
                    ├─ BACKUP_KEEP_DAYS=30 ./scripts/prod.sh backup-db   (one-shot)
                    ├─ ./scripts/prod.sh migrate
                    └─ docker image prune -f
```

In parallel, on the server:

- `smn-backup-cron` runs `pg_dump` every 24h (default) and prunes
  files older than 30 days. Dumps land in `/opt/smn/backups/postgres/`.
- `nginx-proxy-manager` (separate stack on the same host) terminates TLS
  for `smn.<domain>` and proxies to `smn-web:3000` over `proxy-network`.

## Required GitHub secrets

| Secret | Purpose |
|--------|---------|
| `WG_PRIVATE_KEY` | The Actions runner's WireGuard private key. Server-side `wg show` should list its public counterpart as a peer. |
| `WG_SERVER_PUBLIC_KEY` | The SMN host's WireGuard public key. |
| `WG_ENDPOINT` | `<server-public-ip>:<wg-port>` — usually 51820. |
| `DEPLOY_SSH_KEY` | The Actions runner's SSH private key (ed25519). The server's `~deploy-user/.ssh/authorized_keys` must list its public counterpart with the forced-command (see "Server prerequisites"). |
| `DEPLOY_USER` | The unix account on the server that the SSH key is for. Conventionally `deploy`. |
| `PRODUCTION_ENV` | The complete contents of the production `.env` file. Used verbatim — nothing is templated. **Must include `STRIPE_BYPASS=0` and unset `INSTAGRAM_OAUTH_MOCK*`** or those dev switches will leak into production. |

## Server prerequisites (one-time)

1. **Project checkout** at `/opt/smn` (the wrapper scripts default `PROJECT_DIR`
   to one level above `scripts/`). The first deploy creates this when it
   extracts the tarball; you only need the directory writable by `DEPLOY_USER`.
2. **WireGuard** installed and running with the runner's public key in
   the peer list. The runner reaches the server at `10.20.20.1`.
3. **Forced-command SSH** — `~deploy-user/.ssh/authorized_keys` entry looks
   like:
   ```
   command="cd /opt/smn && tar -xzf - && ./scripts/deploy.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... runner@github
   ```
   The forced command means the runner can do exactly one thing — extract a
   tarball into the project dir and run `deploy.sh`.
4. **`proxy-network` Docker network** — created once, shared with the
   nginx-proxy-manager stack:
   ```bash
   docker network create proxy-network
   ```
   The `web` service joins both `smn-network` (internal, postgres) and
   `proxy-network` (the external proxy reaches it here).
5. **nginx-proxy-manager proxy host** for `smn.<domain>`:
   - **Forward Hostname / IP**: `smn-web` (Docker DNS resolves it because
     both containers are on `proxy-network`)
   - **Forward Port**: `3000`
   - **Block common exploits**: on
   - **Websockets support**: on
   - **SSL**: request a Let's Encrypt cert
6. **`pgvector` extension** — created automatically by the
   `20260505_155858_add_voice_samples` migration on first run; no manual
   `CREATE EXTENSION` step needed.

## Production .env requirements

The `PRODUCTION_ENV` secret should be a copy of `.env.example` with **at
minimum** the following changes:

| Variable | Required | Notes |
|----------|----------|-------|
| `POSTGRES_PASSWORD` | yes | `openssl rand -hex 32` |
| `PAYLOAD_SECRET` | yes | `openssl rand -hex 32`, ≥ 32 chars |
| `TOKEN_ENCRYPTION_KEY` | yes | `openssl rand -hex 32`, ≥ 32 chars; encrypts stored OAuth tokens |
| `AGENT_CMS_SECRET` | yes | `openssl rand -hex 32` |
| `RABBITMQ_DEFAULT_PASS` | yes | even though Celery is deferred, the broker still boots |
| `PAYLOAD_PUBLIC_SERVER_URL` | yes | `https://smn.<domain>` — Meta's image fetcher (#13) needs this |
| `NEXT_PUBLIC_SERVER_URL` | yes | same as above |
| `OPENAI_API_KEY` | yes | embedding model is `text-embedding-3-small`; required even when LLM is Ollama |
| `META_APP_ID`, `META_APP_SECRET`, `INSTAGRAM_REDIRECT_URI` | for IG publish | `https://smn.<domain>/api/oauth/instagram/callback`; redirect URI must match the Meta App registration exactly |
| `STRIPE_*` | for billing | `STRIPE_BYPASS=0` (or unset), real `sk_live_*` / `pk_live_*` / `whsec_*` / `price_*` |
| `INSTAGRAM_OAUTH_MOCK` | **must be unset/0** | dev-only switch; if set in prod, the IG OAuth round-trip is faked |

## What the deploy actually does

1. **Build** — `prod.sh build` runs `docker compose build --pull` for the
   four app services. `--pull` keeps base images current.
2. **Start** — `prod.sh start` runs `up -d` against the freshly built
   images, replacing running containers in-place.
3. **Backup** — `BACKUP_KEEP_DAYS=30 prod.sh backup-db` writes a fresh
   `pg_dump` *before* migrations run, so a bad migration is one
   `restore-postgres.sh` away from rolling back.
4. **Migrate** — `prod.sh migrate` runs `payload migrate` against the live
   database. Migrations are tracked in `payload_migrations` so re-running
   the deploy is idempotent.
5. **Prune** — `docker image prune -f` removes dangling untagged images
   left over from the rebuild. Tagged images stay so a rollback can use
   the previous one.

## Backups

Two paths write to `/opt/smn/backups/postgres/`:

- **On-deploy backup** (synchronous, in `deploy.sh`) — captures state
  immediately before the migration runs.
- **Nightly cron** (`smn-backup-cron` sidecar) — captures state every 24h
  regardless of deploys, so a quiet repo still produces backups.

Both use `pg_dump --clean --if-exists --no-owner --no-privileges` and
gzip the output. Both prune anything older than `BACKUP_KEEP_DAYS=30`.

To restore:
```bash
# On the server
./scripts/prod.sh restore-db backups/postgres/smn-20260515-030200.sql.gz
```

## Concurrency, timeouts, and rollback

- `concurrency.group=deploy-main` with `cancel-in-progress: true` — a
  newer push cancels an in-flight deploy mid-stream so you don't end up
  with two SSH streams writing the same tarball at once.
- Workflow `timeout-minutes: 30` — caps the run; in practice a clean
  deploy is 5–8 minutes.
- **Rollback path:**
  1. `git revert <bad-sha> && git push origin main` re-triggers the
     deploy with the previous code.
  2. If the bad migration corrupted data: `./scripts/prod.sh restore-db
     <pre-deploy backup>`.
  3. To pin to a previous image without a code revert: tag the previous
     image (`docker tag smn-web:latest smn-web:rollback`), push the
     code change, then re-tag back if needed.

## Troubleshooting

- **WireGuard handshake fails** — check `WG_SERVER_PUBLIC_KEY` matches
  the server's `wg show` output, and that the runner's public key is in
  the server's peer list.
- **SSH refused** — verify `DEPLOY_USER` matches the `authorized_keys`
  entry, and that the forced-command line is exactly as above.
- **`tar: short read`** — the SSH process closed before the tarball
  finished streaming. Usually means the forced-command's `tar -xzf -` is
  buffering. The current command (`tar -xzf -` followed by
  `./scripts/deploy.sh`) reads the full stream before invoking the
  script, so this should not happen.
- **Migrations error mid-deploy** — the on-deploy backup is fresh.
  Restore it, fix the migration, re-deploy.
- **`smn.<domain>` returns 502** — verify the `web` container is healthy
  (`docker ps` shows `(healthy)`), that nginx-proxy-manager's forward
  target is `smn-web:3000`, and that the web service is on
  `proxy-network` (`docker network inspect proxy-network`).
