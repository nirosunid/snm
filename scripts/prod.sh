#!/usr/bin/env sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/prod.sh build [service...]    # Build all or named services
  ./scripts/prod.sh up [service...]       # Build + start all or named services (-d)
  ./scripts/prod.sh start [service...]    # Start already-built services (-d)
  ./scripts/prod.sh restart [service...]  # Restart all or named services
  ./scripts/prod.sh down                  # Stop and remove the prod stack
  ./scripts/prod.sh stop [service...]     # Stop running services
  ./scripts/prod.sh logs [service...]     # Follow logs
  ./scripts/prod.sh migrate               # Run pending Payload migrations
  ./scripts/prod.sh import-map            # Regenerate Payload admin importMap
  ./scripts/prod.sh generate-types        # Regenerate Payload TS types
  ./scripts/prod.sh exec <svc> <cmd...>   # Run an arbitrary command inside a running service
  ./scripts/prod.sh config                # Validate the merged compose config
  ./scripts/prod.sh backup-db             # Compressed PostgreSQL backup
  ./scripts/prod.sh restore-db <file>     # Restore from backup
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
    DOCKER_BUILDKIT=1 docker compose -f docker-compose.yml -f docker-compose.prod.yml build --pull "$@"
    ;;
  up)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build "$@"
    ;;
  start)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d "$@"
    ;;
  restart)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml restart "$@"
    ;;
  down)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml down
    ;;
  stop)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml stop "$@"
    ;;
  logs)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f "$@"
    ;;
  migrate)
    echo y | docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm --no-deps -T web pnpm run migrate
    ;;
  import-map)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T web pnpm generate:importmap
    ;;
  generate-types)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T web pnpm generate:types
    ;;
  exec)
    SERVICE="${1:?Usage: ./scripts/prod.sh exec <service> <command...>}"
    shift
    docker compose -f docker-compose.yml -f docker-compose.prod.yml exec "$SERVICE" "$@"
    ;;
  config)
    docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet && echo "OK"
    ;;
  backup-db)
    exec ./scripts/backup-postgres.sh prod "$@"
    ;;
  restore-db)
    exec ./scripts/restore-postgres.sh "${1:?Usage: ./scripts/prod.sh restore-db <file>}" prod
    ;;
  *)
    usage
    exit 1
    ;;
esac
