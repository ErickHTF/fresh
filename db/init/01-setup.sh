#!/bin/bash
set -e

for file in /migrations/*.sql; do
  echo "Applying $file"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$file"
done

echo "Seeding $POSTGRES_DB"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /seed/001_web_basics.sql
