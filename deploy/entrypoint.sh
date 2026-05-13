#!/bin/sh
set -e

echo "▶ Running Prisma migrations..."
cd /app/apps/api
node_modules/.bin/prisma migrate deploy
echo "✔ Migrations complete"

# Run seed once if RUN_SEED=true is set, then clear it
if [ "$RUN_SEED" = "true" ]; then
  echo "▶ Running database seed..."
  node node_modules/.bin/prisma db seed
  echo "✔ Seed complete"
fi

echo "▶ Starting supervisord..."
exec supervisord -c /etc/supervisord.conf
