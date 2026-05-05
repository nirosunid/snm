#!/usr/bin/env sh
# Quick-start the prod stack (-d).
exec "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/prod.sh" up "$@"
