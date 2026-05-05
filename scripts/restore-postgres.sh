#!/usr/bin/env bash
# restore-postgres.sh — Restore a PostgreSQL backup (overwrites existing data).
#
# Usage:
#   ./scripts/restore-postgres.sh <backup-file.sql.gz> [dev|prod]   (default env: prod)

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

BACKUP_FILE="${1:?Usage: $0 <backup-file.sql.gz> [dev|prod]}"
ENV="${2:-prod}"

case "$ENV" in
  dev)  COMPOSE_OVERRIDE="docker-compose.dev.yml" ;;
  prod) COMPOSE_OVERRIDE="docker-compose.prod.yml" ;;
  *)    echo "Usage: $0 <backup-file.sql.gz> [dev|prod]" >&2; exit 1 ;;
esac

COMPOSE_FILES=(
  -f "$ROOT_DIR/docker-compose.yml"
  -f "$ROOT_DIR/$COMPOSE_OVERRIDE"
)

SERVICE_NAME="${POSTGRES_SERVICE_NAME:-postgres}"

read_container_env() {
  local var="$1"
  docker compose "${COMPOSE_FILES[@]}" exec -T "$SERVICE_NAME" printenv "$var" 2>/dev/null \
    | tr -d '\r' \
    || true
}

DATABASE_NAME="${POSTGRES_DB:-$(read_container_env POSTGRES_DB)}"
DATABASE_USER="${POSTGRES_USER:-$(read_container_env POSTGRES_USER)}"
DATABASE_NAME="${DATABASE_NAME:-postgres}"
DATABASE_USER="${DATABASE_USER:-postgres}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"

echo "Restoring $BACKUP_FILE into $DATABASE_NAME (env: $ENV)..."
echo "WARNING: this will overwrite existing data. Press Enter to continue, Ctrl-C to abort."
read -r _

gunzip -c "$BACKUP_FILE" \
  | docker compose "${COMPOSE_FILES[@]}" exec -T "$SERVICE_NAME" \
      psql --username="$DATABASE_USER" --dbname="$DATABASE_NAME"

echo "Restore complete."
