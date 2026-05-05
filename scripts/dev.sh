#!/usr/bin/env sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/dev.sh build [service...]    # Build all or named services
  ./scripts/dev.sh up [service...]       # Build + start all or named services
  ./scripts/dev.sh start [service...]    # Start already-built services
  ./scripts/dev.sh restart [service...]  # Restart all or named services
  ./scripts/dev.sh down                  # Stop and remove the dev stack
  ./scripts/dev.sh stop [service...]     # Stop running services
  ./scripts/dev.sh logs [service...]     # Follow logs
  ./scripts/dev.sh migrate               # Run pending Payload migrations
  ./scripts/dev.sh import-map            # Regenerate Payload admin importMap
  ./scripts/dev.sh generate-types        # Regenerate Payload TS types
  ./scripts/dev.sh exec <svc> <cmd...>   # Run an arbitrary command inside a running service
  ./scripts/dev.sh config                # Validate the merged compose config (parse only)
  ./scripts/dev.sh backup-db             # Compressed PostgreSQL backup
  ./scripts/dev.sh restore-db <file>     # Restore from backup

Examples:
  ./scripts/dev.sh up
  ./scripts/dev.sh up web
  ./scripts/dev.sh import-map
  ./scripts/dev.sh exec web sh
  ./scripts/dev.sh exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select 1"
  ./scripts/dev.sh logs celery-worker
EOF
}

if [ "$#" -lt 1 ]; then
  usage
  exit 1
fi

COMMAND="$1"
shift

cd "$ROOT_DIR"

case "$COMMAND" in
  build)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml build "$@"
    ;;
  up)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build "$@"
    ;;
  start)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up "$@"
    ;;
  restart)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml restart "$@"
    ;;
  down)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml down
    ;;
  stop)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml stop "$@"
    ;;
  logs)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f "$@"
    ;;
  migrate)
    echo y | docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm --no-deps -T web pnpm run migrate
    ;;
  import-map)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T web pnpm generate:importmap
    ;;
  generate-types)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T web pnpm generate:types
    ;;
  exec)
    SERVICE="${1:?Usage: ./scripts/dev.sh exec <service> <command...>}"
    shift
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec "$SERVICE" "$@"
    ;;
  config)
    docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet && echo "OK"
    ;;
  backup-db)
    exec ./scripts/backup-postgres.sh dev "$@"
    ;;
  restore-db)
    exec ./scripts/restore-postgres.sh "${1:?Usage: ./scripts/dev.sh restore-db <file>}" dev
    ;;
  *)
    usage
    exit 1
    ;;
esac
