#!/bin/bash
set -e

echo "🔄 Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$CATS_DB_PASSWORD psql -h "$CATS_DB_HOST" -U "$CATS_DB_USER" -d "$CATS_DB_NAME" -c '\q' 2>/dev/null; do
  echo "⏳ PostgreSQL is unavailable - waiting..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
npm run db:migrate

# Seed database if no users exist
echo "🔄 Checking if database needs seeding..."
USER_COUNT=$(PGPASSWORD=$CATS_DB_PASSWORD psql -h "$CATS_DB_HOST" -U "$CATS_DB_USER" -d "$CATS_DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
if [ "$USER_COUNT" = "0" ]; then
  echo "🌱 Seeding database with admin user..."
  npm run db:seed
else
  echo "✅ Database already seeded (${USER_COUNT} users found)"
fi

echo "🚀 Starting CATS application..."
exec "$@"
