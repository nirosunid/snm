#!/usr/bin/env bash
# backup-postgres.sh — Create a compressed PostgreSQL backup.
#
# Usage:
#   ./scripts/backup-postgres.sh [dev|prod]   (default: prod)
#
# Environment variables:
#   POSTGRES_SERVICE_NAME  Docker Compose service name (default: postgres)
#   POSTGRES_DB            Database name to dump        (read from container)
#   POSTGRES_USER          Database user                (read from container)
#   BACKUP_DIR             Output dir                   (default: <repo>/backups/postgres)
#   BACKUP_KEEP            Keep last N files (default: 5, 0 = disabled)
#   BACKUP_KEEP_DAYS       Remove files older than N days (default: 30, 0 = disabled)

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

ENV="${1:-prod}"
case "$ENV" in
  dev)  COMPOSE_OVERRIDE="docker-compose.dev.yml" ;;
  prod) COMPOSE_OVERRIDE="docker-compose.prod.yml" ;;
  *)    echo "Usage: $0 [dev|prod]" >&2; exit 1 ;;
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
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/postgres}"
TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_FILE="$BACKUP_DIR/${DATABASE_NAME}-${TIMESTAMP}.sql.gz"
BACKUP_SUCCESS=0

mkdir -p "$BACKUP_DIR"
cd "$ROOT_DIR"

cleanup() {
  if [ "$BACKUP_SUCCESS" -ne 1 ] && [ -f "$BACKUP_FILE" ]; then
    rm -f "$BACKUP_FILE"
  fi
}
trap cleanup EXIT

if ! docker compose "${COMPOSE_FILES[@]}" ps --status running "$SERVICE_NAME" >/dev/null 2>&1; then
  echo "Postgres service '$SERVICE_NAME' is not running." >&2
  exit 1
fi

echo "Creating PostgreSQL backup at $BACKUP_FILE"

docker compose "${COMPOSE_FILES[@]}" exec -T "$SERVICE_NAME" \
  pg_dump \
    --username="$DATABASE_USER" \
    --dbname="$DATABASE_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges | gzip > "$BACKUP_FILE"

BACKUP_SUCCESS=1
echo "Backup completed: $BACKUP_FILE"

KEEP="${BACKUP_KEEP:-5}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

if [ "$KEEP_DAYS" -gt 0 ]; then
  find "$BACKUP_DIR" -maxdepth 1 -name "*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
  echo "Pruned files older than ${KEEP_DAYS} days."
fi

if [ "$KEEP" -gt 0 ]; then
  ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n "+$((KEEP + 1))" | xargs -r rm -f
  echo "Kept last $KEEP backup files."
fi
