#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR"

docker compose down -v --remove-orphans
docker compose up -d --wait --wait-timeout 60 postgres

sudo systemctl restart fresh

if ! systemctl is-active --quiet fresh; then
  echo "Service fresh is not active after restart" >&2
  exit 1
fi

echo "Database recreated with migrations and seed"
