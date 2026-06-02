#!/usr/bin/env bash
# deploy.sh — Production deploy on the SMN host (server-side).
#
# Usage:
#   PROJECT_DIR=/opt/smn ./scripts/deploy.sh
#   PROJECT_DIR=/opt/smn DEPLOY_SHA=<sha> ./scripts/deploy.sh
#
# What it does (in order):
#   1. Rebuild Docker images for: web, agents, celery-worker, flower
#      (uses ./scripts/prod.sh build)
#   2. Start / replace running containers with the freshly built images
#      (uses ./scripts/prod.sh start)
#   3. Back up the database to backups/postgres/ (30-day retention by default)
#   4. Run Payload database migrations via a one-shot web container
#   5. Remove dangling Docker images (untagged build leftovers) to free disk space
#
# Environment variables:
#   PROJECT_DIR  (optional) Absolute path to the repo root on the server.
#                Defaults to the parent directory of this script.
#   DEPLOY_SHA   (optional) GitHub commit SHA or deploy identifier for logging.
#
# Called by:
#   .github/workflows/deploy-main.yml  (over SSH on the SMN host)

set -euo pipefail

TOTAL_STEPS=5

# log: timestamped line prefixed with "DEPLOY:".
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] DEPLOY: $*"; }

# step <n> <message>: log a step line as "[n/TOTAL_STEPS] message".
step() { log "[$1/$TOTAL_STEPS] $2"; }

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)}"
DEPLOY_SHA="${DEPLOY_SHA:-unknown}"

log "Project dir: $PROJECT_DIR"
log "Deploy SHA: $DEPLOY_SHA"

cd "$PROJECT_DIR"

step 1 "Rebuilding Docker images..."
./scripts/prod.sh build web agents celery-worker flower
step 1 "Done."

step 2 "Starting services..."
./scripts/prod.sh start web agents celery-worker flower
step 2 "Done."

step 3 "Backing up database..."
BACKUP_KEEP_DAYS=30 ./scripts/prod.sh backup-db
step 3 "Done."

step 4 "Running database migrations..."
./scripts/prod.sh migrate
step 4 "Done."

step 5 "Removing dangling Docker images..."
docker image prune -f
step 5 "Done."

log "Deploy complete (sha: $DEPLOY_SHA)."
