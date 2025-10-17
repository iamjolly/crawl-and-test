#!/bin/bash
# Setup Test Database Script
# Creates and migrates the test database for CATS

set -e  # Exit on error

echo "🔧 Setting up test database..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Find PostgreSQL container
CONTAINER_NAME=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -n 1)

if [ -z "$CONTAINER_NAME" ]; then
    echo -e "${RED}❌ PostgreSQL container not found.${NC}"
    echo -e "${YELLOW}💡 Start it with: docker compose -f docker-compose.dev.yml up -d postgres${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found PostgreSQL container: $CONTAINER_NAME"

# Check if database already exists
DB_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U cats_user postgres -tAc "SELECT 1 FROM pg_database WHERE datname='cats_test'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}⚠${NC}  Test database 'cats_test' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑  Dropping existing database..."
        docker exec "$CONTAINER_NAME" psql -U cats_user postgres -c "DROP DATABASE cats_test;" >/dev/null 2>&1 || true
        echo -e "${GREEN}✓${NC} Database dropped"
    else
        echo "Skipping database creation."
    fi
fi

# Create database if it doesn't exist
DB_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U cats_user postgres -tAc "SELECT 1 FROM pg_database WHERE datname='cats_test'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" != "1" ]; then
    echo "📦 Creating test database..."
    docker exec "$CONTAINER_NAME" psql -U cats_user postgres -c "CREATE DATABASE cats_test OWNER cats_user;" >/dev/null
    echo -e "${GREEN}✓${NC} Test database created"
else
    echo -e "${GREEN}✓${NC} Test database exists"
fi

# Run migrations
echo "🔄 Running database migrations..."
NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Migrations completed successfully"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

# Verify tables exist
echo "🔍 Verifying database schema..."
TABLES=$(docker exec "$CONTAINER_NAME" psql -U cats_user -d cats_test -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null)

if [ "$TABLES" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $TABLES tables in test database"
    echo ""
    echo "Tables created:"
    docker exec "$CONTAINER_NAME" psql -U cats_user -d cats_test -c "\dt" | grep "public" | awk '{print "  - " $3}'
else
    echo -e "${RED}❌ No tables found in database${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Test database setup complete!${NC}"
echo ""
echo "Run tests with: ${YELLOW}npm test${NC}"
