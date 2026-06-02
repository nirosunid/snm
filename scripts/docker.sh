#!/usr/bin/env sh
# docker.sh — Convenience wrappers for inspecting the SMN Docker stack.

set -eu

usage() {
  cat <<'EOF'
Usage:
  ./scripts/docker.sh containers            # List running SMN containers (smn-*)
  ./scripts/docker.sh containers-all        # List all containers, including stopped ones
  ./scripts/docker.sh container <name>      # Inspect one container
  ./scripts/docker.sh logs <name>           # Follow logs for one container
  ./scripts/docker.sh exec <name> [cmd...]  # Open a shell or run a command in one container
  ./scripts/docker.sh top <name>            # Show processes running in one container
  ./scripts/docker.sh stats                 # Live CPU / memory usage for running containers
  ./scripts/docker.sh images                # List local Docker images (SMN-related)
  ./scripts/docker.sh image <name>          # Inspect one image
  ./scripts/docker.sh networks              # List Docker networks
  ./scripts/docker.sh network <name>        # Inspect one network
  ./scripts/docker.sh volumes               # List Docker volumes
  ./scripts/docker.sh volume <name>         # Inspect one volume

Examples:
  ./scripts/docker.sh containers
  ./scripts/docker.sh container smn-web
  ./scripts/docker.sh logs smn-web
  ./scripts/docker.sh exec smn-web
  ./scripts/docker.sh exec smn-web env
  ./scripts/docker.sh image smn-web
  ./scripts/docker.sh networks
  ./scripts/docker.sh network proxy-network
EOF
}

if [ "$#" -lt 1 ]; then
  usage
  exit 1
fi

COMMAND="$1"
shift

require_one_arg() {
  if [ "$#" -lt 1 ]; then
    usage
    exit 1
  fi
}

case "$COMMAND" in
  containers)
    docker ps --filter "name=smn-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
  containers-all)
    docker ps -a
    ;;
  container)
    require_one_arg "$@"
    docker inspect "$1"
    ;;
  logs)
    require_one_arg "$@"
    docker logs -f "$1"
    ;;
  exec)
    require_one_arg "$@"
    CONTAINER="$1"
    shift
    if [ "$#" -eq 0 ]; then
      exec docker exec -it "$CONTAINER" sh
    fi
    exec docker exec -it "$CONTAINER" "$@"
    ;;
  top)
    require_one_arg "$@"
    docker top "$1"
    ;;
  stats)
    docker stats
    ;;
  images)
    docker images | grep -E "(smn|postgres|rabbitmq|pgvector)" || docker images
    ;;
  image)
    require_one_arg "$@"
    docker image inspect "$1"
    ;;
  networks)
    docker network ls
    ;;
  network)
    require_one_arg "$@"
    docker network inspect "$1"
    ;;
  volumes)
    docker volume ls
    ;;
  volume)
    require_one_arg "$@"
    docker volume inspect "$1"
    ;;
  *)
    usage
    exit 1
    ;;
esac
