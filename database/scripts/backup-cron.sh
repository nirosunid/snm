#!/usr/bin/env bash
# backup-cron.sh — Run pg_dump on a daily schedule from inside a sidecar
# container. Connects to the `postgres` service over the smn-network and
# writes gzipped dumps to /backups (mounted from the host).
#
# Schedule: first run after BACKUP_INITIAL_DELAY_SECONDS (default 60s so the
# stack has settled), then every 24h thereafter. Missing the wall-clock 3am
# window in exchange for not needing cron + tzdata + DST plumbing inside
# the container — close enough for nightly.

set -euo pipefail

log() { echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] [backup-cron] $*"; }

PGUSER="${POSTGRES_USER:?POSTGRES_USER must be set}"
PGPASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
PGDATABASE="${POSTGRES_DB:?POSTGRES_DB must be set}"
PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
INITIAL_DELAY="${BACKUP_INITIAL_DELAY_SECONDS:-60}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

export PGPASSWORD

mkdir -p "$BACKUP_DIR"

run_backup() {
  local timestamp
  timestamp="$(date -u '+%Y%m%d-%H%M%S')"
  local file="$BACKUP_DIR/${PGDATABASE}-${timestamp}.sql.gz"
  log "Starting pg_dump → $file"
  if pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    | gzip > "$file"; then
    log "Backup completed: $file ($(du -h "$file" | cut -f1))"
  else
    log "Backup FAILED — removing partial file."
    rm -f "$file"
    return 1
  fi

  if [ "$BACKUP_KEEP_DAYS" -gt 0 ]; then
    local pruned
    pruned="$(find "$BACKUP_DIR" -maxdepth 1 -name '*.sql.gz' -mtime "+${BACKUP_KEEP_DAYS}" -print -delete | wc -l)"
    log "Pruned $pruned file(s) older than ${BACKUP_KEEP_DAYS} days."
  fi
}

log "Waiting ${INITIAL_DELAY}s before first backup..."
sleep "$INITIAL_DELAY"

while true; do
  run_backup || log "Continuing after failure; will retry next interval."
  log "Next backup in ${INTERVAL}s."
  sleep "$INTERVAL"
done
