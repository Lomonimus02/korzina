#!/bin/sh
set -e

echo "🔄 Syncing Prisma schema with database..."
npx prisma db push --skip-generate

echo "✅ Database sync complete. Starting server..."
exec node server.js
