#!/bin/sh
set -e

echo "🔄 Syncing Prisma schema with database..."
npx prisma db push --skip-generate --accept-data-loss

echo "✅ Database sync complete. Starting server..."
exec node server.js
