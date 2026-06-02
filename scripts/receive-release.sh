#!/usr/bin/env bash
# receive-release.sh — Atomic-release deploy receiver for the SMN host.
#
# Invoked via SSH forced-command for the deploy key. Reads a tar.gz tarball
# from stdin (streamed by .github/workflows/deploy-main.yml), extracts it into
# a new timestamped release directory under "$APP_ROOT/releases/", flips the
# "$APP_ROOT/current" symlink, then runs the project's deploy script.
#
# Configuration (env vars, overridable from the forced-command):
#   APP_ROOT  Absolute path of the application root on the server.
#             Defaults to /opt/apps/smn.
#             Override per-host or per-env, e.g.:
#               command="APP_ROOT=/opt/apps/smn-staging /opt/apps/smn/bin/receive-release.sh",…
#   KEEP      Number of release directories to retain after each deploy.
#             Defaults to 5.
#
# Layout on the server (with default APP_ROOT):
#   /opt/apps/smn/
#     ├── bin/receive-release.sh   (a copy of THIS file, stable across deploys)
#     ├── releases/<ts>/           (new dir per deploy — tarball extracts here)
#     └── current -> releases/<ts> (symlink, atomically swapped)
#
# Why a stable symlink:
#   `cd "$CURRENT"` before invoking deploy.sh keeps the Docker Compose working
#   directory (and therefore the build.context path) constant across deploys.
#   Combined with `name: smn` in docker-compose.yml, this lets BuildKit and
#   Compose reuse cached layers and the previously built smn-* images instead
#   of rebuilding from scratch.
#
# Security note:
#   This script MUST be installed under a path owned by root and NOT writable
#   by the deploy user. Otherwise the deploy user could rewrite it on a deploy
#   and escape the forced-command sandbox.
#
# Installation (one-shot, run as root on the server):
#   sudo install -d -m 0755 -o root -g root /opt/apps/smn/bin
#   sudo install -m 0755 -o root -g root receive-release.sh \
#     /opt/apps/smn/bin/receive-release.sh
#
# authorized_keys entry (single line, for the deploy user — NOT root):
#   command="/opt/apps/smn/bin/receive-release.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 <KEY> smn_deploy

set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/apps/smn}"
KEEP="${KEEP:-5}"

RELEASES="$APP_ROOT/releases"
CURRENT="$APP_ROOT/current"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] RECEIVE-RELEASE: $*"; }

ts=$(date +%Y%m%d%H%M%S)
r="$RELEASES/$ts"

log "Extracting release into $r"
mkdir -p "$r"
tar -xzf - -C "$r"

log "Updating $CURRENT symlink -> $r"
ln -sfn "$r" "$CURRENT"

log "Invoking deploy.sh from $CURRENT"
cd "$CURRENT"
PROJECT_DIR="$CURRENT" ./scripts/deploy.sh

log "Pruning old releases (keeping last $KEEP)"
ls -dt "$RELEASES"/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf

log "Done."
