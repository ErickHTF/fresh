#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR"

rm -rf _fresh.failed
rm -rf _fresh.previous
if [ -d _fresh ]; then mv _fresh _fresh.previous; fi
mv _fresh.next _fresh

sudo systemctl restart "$SERVICE"

healthy=0
for _ in $(seq 1 15); do
  if curl -fsS -o /dev/null "http://localhost:$PORT/health"; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  echo "Health check failed on port $PORT; rolling back" >&2
  rm -rf _fresh.failed
  mv _fresh _fresh.failed
  if [ -d _fresh.previous ]; then mv _fresh.previous _fresh; fi
  sudo systemctl restart "$SERVICE"
  exit 1
fi

echo "App healthy: $SERVICE on port $PORT"
