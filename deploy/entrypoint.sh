#!/bin/sh
set -e

cd /app/apps/api

attempt=1
max_attempts=6
until node_modules/.bin/prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "✖ Prisma migrations failed after ${max_attempts} attempts"
    exit 1
  fi

  echo "⚠ Prisma migrations failed (attempt ${attempt}/${max_attempts}); retrying in 10s..."
  attempt=$((attempt + 1))
  sleep 10
done

echo "✔ Migrations complete"

# Seed is idempotent, so always run it after migrations to ensure
# default templates and the admin account exist on fresh Azure databases.
echo "▶ Running database seed..."
node_modules/.bin/prisma db seed
echo "✔ Seed complete"

echo "▶ Starting supervisord..."
exec supervisord -c /etc/supervisord.conf
