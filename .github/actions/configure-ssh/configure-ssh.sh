#!/usr/bin/env bash
set -euo pipefail

mkdir -p ~/.ssh
printf '%s\n' "$SSH_KEY" > ~/.ssh/deploy_key
chmod 600 ~/.ssh/deploy_key

if [ -n "$SSH_FINGERPRINT" ]; then
  scanned=$(ssh-keyscan -H "$SSH_HOST" 2>/dev/null)
  actual=$(printf '%s\n' "$scanned" | ssh-keygen -lf - | awk '{print $2}' | sort -u)
  if ! printf '%s\n' "$actual" | grep -qx "$SSH_FINGERPRINT"; then
    echo "Host key fingerprint mismatch for $SSH_HOST" >&2
    exit 1
  fi
  printf '%s\n' "$scanned" > ~/.ssh/known_hosts
else
  ssh-keyscan -H "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null
fi
