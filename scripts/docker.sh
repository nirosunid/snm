#!/usr/bin/env sh
# docker.sh — Convenience wrappers for inspecting the SMN Docker stack.

set -eu

usage() {
  cat <<'EOF'
Usage:
  ./scripts/docker.sh containers          # List running containers (smn-* only)
  ./scripts/docker.sh images              # List images
  ./scripts/docker.sh exec <container>    # Open a shell in a running container
  ./scripts/docker.sh logs <container>    # Tail container logs
  ./scripts/docker.sh stats               # Live resource usage
EOF
}

if [ "$#" -lt 1 ]; then
  usage
  exit 1
fi

CMD="$1"
shift

case "$CMD" in
  containers)
    docker ps --filter "name=smn-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
  images)
    docker images | grep -E "(smn|postgres|rabbitmq|pgvector)" || docker images
    ;;
  exec)
    NAME="${1:?Usage: ./scripts/docker.sh exec <container>}"
    docker exec -it "$NAME" sh
    ;;
  logs)
    NAME="${1:?Usage: ./scripts/docker.sh logs <container>}"
    docker logs -f "$NAME"
    ;;
  stats)
    docker stats --no-stream
    ;;
  *)
    usage
    exit 1
    ;;
esac
