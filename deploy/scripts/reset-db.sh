#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR"

docker compose down -v --remove-orphans
docker compose up -d --wait --wait-timeout 60 postgres

for svc in fresh fresh-dev; do
  if systemctl cat "$svc.service" >/dev/null 2>&1; then
    sudo systemctl restart "$svc" || true
    if ! systemctl is-active --quiet "$svc"; then
      echo "Service $svc is not active after restart" >&2
      exit 1
    fi
  fi
done

echo "Database recreated with migrations and seed"
