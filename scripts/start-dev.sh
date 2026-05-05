#!/usr/bin/env sh
# Quick-start the dev stack.
exec "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/dev.sh" up "$@"
