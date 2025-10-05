# Docker Testing Guide - Phase 1A

## Two Environments Available

CATS now has **two Docker environments**:

1. **Production-like** (`docker-compose.yml`) - Port 3000
2. **Development** (`docker-compose.dev.yml`) - Port 3333 with live code
   reloading

Both environments automatically:

- Start PostgreSQL database
- Wait for PostgreSQL to be ready
- Run database migrations
- Seed admin user (if database is empty)
- Start the CATS application

---

## Production-like Environment (Port 3000)

Best for testing the production build.

```bash
# Start everything (will build on first run)
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

**Access:** http://localhost:3000

---

## Development Environment (Port 3333)

Best for active development with **live code reloading**:

- ✅ SASS watcher (CSS changes rebuild automatically)
- ✅ Source code mounted (restart container to see changes)
- ✅ All devDependencies available

```bash
# Start dev environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or run in background
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Stop everything
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

**Access:** http://localhost:3333

**Benefits:**

- Edit SCSS files → CSS rebuilds automatically
- Edit JS files → restart container (faster than full rebuild)
- Same database as production environment
- Test with real PostgreSQL

## First Run

On first run, you'll see:

```
🔄 Waiting for PostgreSQL to be ready...
✅ PostgreSQL is ready!
🔄 Running database migrations...
== 20251005000001-create-users: migrated (0.013s)
== 20251005000002-create-sessions: migrated (0.005s)
== 20251005000003-create-crawl-jobs: migrated (0.010s)
🌱 Seeding database with admin user...
🚀 Starting CATS application...
```

---

## Admin Credentials (Both Environments)

- **Admin Email:** admin@example.com
- **Admin Password:** admin123

## Useful Commands

```bash
# Rebuild after code changes
docker-compose up --build

# Access PostgreSQL CLI
docker-compose exec postgres psql -U cats_user -d cats_dev

# Check database tables
docker-compose exec postgres psql -U cats_user -d cats_dev -c "\dt"

# Fresh start (removes all data)
docker-compose down -v && docker-compose up --build
```

## Troubleshooting

**Port 3000 already in use:**

```bash
lsof -ti :3000 | xargs kill -9
```

**Port 5432 conflict (local PostgreSQL):**

```bash
brew services stop postgresql@14
```

## What Gets Tested

✅ PostgreSQL 16 connection  
✅ Database migrations  
✅ Admin user seeding  
✅ CATS application startup  
✅ All Phase 0 pages (home, crawl, dashboard, reports)  
✅ Navigation system
