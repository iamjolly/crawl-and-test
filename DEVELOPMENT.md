# Development & Build Scripts

This document contains build, development, and configuration scripts for CATS,
including Docker development workflows and cloud deployment.

## Development environments

### Docker development (recommended)

Quick start:

```bash
# Build and start the development environment
Two options are supported for local development — pick one that matches your preferences.

# Stop the environment


# Rebuild after code changes
- Host-watcher (safe & fast) — recommended for most contributors:
```

Benefits:

- Consistent environment across machines
- No local Node.js/Playwright setup required
- Includes all system dependencies
- Matches production environment

Docker commands:

| Command | Description |
| ------- | ----------- |

npm run install-browsers

- Faster iteration for code changes

# Development & Build Scripts

This repository contains build and development workflows for CATS. The sections
below describe Docker-based development, local workflows, build scripts,
configuration variables, and performance tuning tips.

## Development environments

### Docker (recommended)

Quick start:

```bash
docker-compose up --build
```

Stop the environment:

```bash
docker-compose down
```

Rebuild and recreate containers:

```bash
docker-compose up --build --force-recreate
```

Why use Docker:

- Provides a consistent environment for all contributors
- Bundles system dependencies (no local Playwright install required)
- Mirrors production behavior when needed

Useful Docker commands:

| Command                             | Description                   |
| ----------------------------------- | ----------------------------- |
| `docker-compose up`                 | Start development environment |
| `docker-compose up --build`         | Rebuild and start             |
| `docker-compose down`               | Stop and remove containers    |
| `docker-compose logs`               | View application logs         |
| `docker-compose exec cats-app bash` | Shell into running container  |

### Local development

Install dependencies and start the app locally:

```bash
npm install
npm run install-browsers
npm run dev
```

Local development benefits:

- Faster edit-build-test loop
- Direct access to host files and IDE tooling
- Avoid Docker overhead when iterating on small changes

## Build & development scripts

| Command                    | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | Start SASS watcher + serve dashboard (default port 3000) |
| `npm run serve`            | Start the dashboard server only                          |
| `npm run build`            | Full build: compile SASS and generate reports            |
| `npm run build:prod`       | Production build with CSS optimizations                  |
| `npm run sass:build`       | Compile all SASS files                                   |
| `npm run sass:watch`       | Watch and compile SASS during development                |
| `npm run install-browsers` | Install Playwright browsers                              |
| `npm run html:build`       | Generate HTML from report JSON data                      |
| `npm run clean`            | Remove generated artifacts                               |

### SASS-related scripts

| Command                            | Description                  |
| ---------------------------------- | ---------------------------- |
| `npm run sass:design-system`       | Compile design-system SASS   |
| `npm run sass:report`              | Compile report-specific SASS |
| `npm run sass:design-system:watch` | Watch design-system SASS     |

### CSS optimization

| Command                | Description                       |
| ---------------------- | --------------------------------- |
| `npm run css:optimize` | Run PostCSS/cssnano optimizations |

### Container & deployment

| Command                        | Description                |
| ------------------------------ | -------------------------- |
| `docker build -t cats .`       | Build Docker image         |
| `docker run -p 3000:3000 cats` | Run container locally      |
| `gcloud builds submit`         | Deploy to Google Cloud Run |

### Testing & quality

| Command          | Description        |
| ---------------- | ------------------ |
| `npm test`       | Run unit tests     |
| `npm run lint`   | Run linters        |
| `npm run format` | Run code formatter |

## Environment variables

See `.env.example` for full details. Examples below are safe defaults for local
development.

Local variables:

```bash
CATS_SERVER_PORT=3000
CATS_SERVER_HOST=localhost
CATS_MAX_PAGES=25
```

Docker-specific variables (set via `.env` or `docker-compose.yml`):

```bash
CATS_SERVER_HOST=0.0.0.0
PORT=3000
```

## Performance configuration

Browser pool settings:

```bash
CATS_BROWSER_POOL_SIZE=2
CATS_BROWSER_MEMORY_LIMIT_MB=1024
```

Timeouts and retries:

```bash
CATS_PAGE_TIMEOUT=90000
CATS_SITEMAP_TIMEOUT=20000
CATS_MAX_RETRIES=3
CATS_RETRY_DELAY_MS=2000
```

Concurrency and defaults:

```bash
CATS_MAX_CONCURRENT_JOBS=3
CATS_DEFAULT_CRAWLER_CONCURRENCY=4
CATS_WAIT_STRATEGY=domcontentloaded
CATS_DISABLE_IMAGES=true
```

### Performance testing

High-performance local testing (250+ pages):

```bash
cp .env.example .env.performance
CATS_MAX_PAGES=250
CATS_DEFAULT_CRAWLER_CONCURRENCY=8
CATS_PAGE_TIMEOUT=90000
CATS_BROWSER_POOL_SIZE=4
CATS_MAX_CONCURRENT_JOBS=2
CATS_DISABLE_IMAGES=true
node src/core/crawler.js -s https://example.com --max-pages 250 -c 8
```

Memory-optimized configuration (low-RAM machines):

```bash
CATS_BROWSER_POOL_SIZE=1
CATS_DEFAULT_CRAWLER_CONCURRENCY=2
CATS_MAX_CONCURRENT_JOBS=1
CATS_BROWSER_MEMORY_LIMIT_MB=512
```

## Cloud storage

```bash
CATS_USE_CLOUD_STORAGE=true
GOOGLE_CLOUD_PROJECT=your-project
CATS_STORAGE_BUCKET=your-bucket
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

Storage locations:

| Environment | Reports Location     |
| ----------- | -------------------- |
| Local Dev   | `./public/reports/`  |
| Docker Dev  | `./public/reports/`  |
| Cloud Run   | Google Cloud Storage |

## Notes about Docker Compose and local SASS workflows

Two recommended workflows:

1. Image-baked (default)

- Do not mount `./public/styles` into containers. Rebuild the image when SASS
  changes are required:

```bash
docker-compose up --build
```

2. Host-watcher (fast iteration)

- Mount host `./public/styles` and run a SASS watcher locally:

```bash
npm install
npm run sass:build
npm run sass:watch:local
```

Recommended host commands (run from project root):

```bash
npm install
npm run sass:build
npm run sass:watch:local
docker-compose up --build
```

Local dev options summary:

- Host-watcher: fast iteration, run watcher on host and mount styles into
  container.
- All-in-container: run `npm run compose:dev` to start watcher+server inside
  Docker (useful if you want everything contained).

Notes:

- Dev image keeps devDependencies; rebuilding is required for package changes.
- SCSS changes typically do not require rebuilding the dev image when using
  host-watcher.

CATS_WCAG_VERSION=2.1 # WCAG version (2.0, 2.1, 2.2) CATS_WCAG_LEVEL=AA # WCAG
level (A, AA, AAA)

````

### 🐳 Docker Development Variables

```bash
# Set in docker-compose.yml or .env
CATS_SERVER_HOST=0.0.0.0          # Allow external connections
PORT=3000                         # Container port mapping
````

## ⚡ Performance Configuration

### Browser Pool Settings

```bash
CATS_BROWSER_POOL_SIZE=2          # Number of browser instances to reuse
CATS_BROWSER_MEMORY_LIMIT_MB=1024 # Memory limit per browser (MB)
```

### Timeout & Retry Configuration

```bash
CATS_PAGE_TIMEOUT=90000           # Page navigation timeout (90s for slow sites)
CATS_SITEMAP_TIMEOUT=20000        # Sitemap parsing timeout (20s)
CATS_MAX_RETRIES=3                # Retry attempts for failed pages
CATS_RETRY_DELAY_MS=2000          # Base retry delay (2s, exponential backoff)
```

### Concurrency & Performance

```bash
CATS_MAX_CONCURRENT_JOBS=3        # Max simultaneous crawl jobs
CATS_DEFAULT_CRAWLER_CONCURRENCY=4 # Parallel browsers per job
CATS_WAIT_STRATEGY=domcontentloaded # Page wait strategy
CATS_DISABLE_IMAGES=true          # Disable images for faster crawling
CATS_DISABLE_CSS=false            # Keep CSS for layout (recommended)
```

### Performance Testing Configuration

**High-Performance Local Testing (250+ pages):**

```bash
# Create performance testing environment
cp .env.example .env.performance

# Add performance optimizations
CATS_MAX_PAGES=250
CATS_DEFAULT_CRAWLER_CONCURRENCY=8
CATS_PAGE_TIMEOUT=90000
CATS_BROWSER_POOL_SIZE=4
CATS_MAX_CONCURRENT_JOBS=2
CATS_DISABLE_IMAGES=true
CATS_WAIT_STRATEGY=domcontentloaded

# Run performance test
node src/core/crawler.js -s https://example.com --max-pages 250 -c 8
```

**Memory-Optimized Configuration:**

```bash
# For limited RAM environments
CATS_BROWSER_POOL_SIZE=1
CATS_DEFAULT_CRAWLER_CONCURRENCY=2
CATS_MAX_CONCURRENT_JOBS=1
CATS_BROWSER_MEMORY_LIMIT_MB=512
```

### ☁️ Cloud Storage Variables

```bash
CATS_USE_CLOUD_STORAGE=true       # Enable Google Cloud Storage
GOOGLE_CLOUD_PROJECT=your-project # GCP project ID
CATS_STORAGE_BUCKET=your-bucket   # GCS bucket name
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

### 🔧 Storage Locations

| Environment | Reports Location    | Access Method      |
| ----------- | ------------------- | ------------------ |
| Local Dev   | `./public/reports/` | Direct file system |
| Docker Dev  | `./public/reports/` | Volume mounted     |
| Cloud Run   | GCS bucket          | Public HTTPS URLs  |

## Notes about Docker Compose and local SASS workflows

When running via Docker Compose (the recommended dev environment), the Docker
image includes the compiled CSS that is generated during the image build (the
Dockerfile runs `npm run sass:build`). To avoid accidentally serving stale CSS
from your host you have two options:

- Use the image-baked assets (default): do not mount `./public/styles` into the
  container. This mirrors production: rebuild the image with
  `docker-compose up --build` to pick up SASS changes.

- Use a local edit-and-watch workflow (fast iteration): mount `./public/styles`
  into the container and run a SASS watcher locally that compiles `src/styles`
  into `public/styles` on your machine. The container will then serve the
  freshly compiled host CSS while you iterate.

Recommended local commands (from project root):

```bash
# install deps
npm install

# build once
npm run sass:build

# start SASS watcher (rebuilds CSS automatically on changes)
npm run sass:watch:local

# in another terminal, start the app (either locally or via compose)
docker-compose up --build
```

If you prefer the image-baked flow (no host mounts), remove the
`./public/styles:/app/public/styles` mount from `docker-compose.yml` and always
run `docker-compose up --build` after changing SASS files.

If you plan to use the dev compose override (`docker-compose.dev.yml`) the
recommended workflow is to run the SASS watcher on your host rather than inside
the container because the image prunes devDependencies during build. From the
project root:

```bash
npm install
npm run sass:watch:local   # run on host to compile into public/styles
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This way the container serves the host-compiled CSS while you iterate.

### Local Dev Workflows (recommended)

Two options are supported for local development — pick one that matches your
preferences.

- Host-watcher (safe & fast) — recommended for most contributors:

1.  Start the SASS watcher on your host:

    ```bash
    npm install
    npm run sass:watch:local
    ```

2.  Start the dev container with host mounts:

    ```bash
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
    ```

- All-in-container dev image (one-command) — useful when you want everything
  inside Docker:

  Start the one-command dev image (includes watcher + server, runs on port
  3333):

  ```bash
  npm run compose:dev
  # or the convenience script that starts host watcher + dev image:
  npm run dev:all
  ```

Notes:

- The dev image (`Dockerfile.dev`) keeps devDependencies so the in-container
  watcher can run, but the dev image is larger and intended only for local
  development.
- Editing package.json or adding native deps still requires rebuilding the dev
  image. SCSS changes do not.

```bash
CATS_MAX_CONCURRENT_JOBS=3        # Max simultaneous crawl jobs
CATS_DEFAULT_CRAWLER_CONCURRENCY=4 # Parallel browsers per job
CATS_WAIT_STRATEGY=domcontentloaded # Page wait strategy
CATS_DISABLE_IMAGES=true          # Disable images for faster crawling
CATS_DISABLE_CSS=false            # Keep CSS for layout (recommended)
```

### Performance Testing Configuration

**High-Performance Local Testing (250+ pages):**

```bash
# Create performance testing environment
cp .env.example .env.performance

# Add performance optimizations
CATS_MAX_PAGES=250
CATS_DEFAULT_CRAWLER_CONCURRENCY=8
CATS_PAGE_TIMEOUT=90000
CATS_BROWSER_POOL_SIZE=4
CATS_MAX_CONCURRENT_JOBS=2
CATS_DISABLE_IMAGES=true
CATS_WAIT_STRATEGY=domcontentloaded

# Run performance test
node src/core/crawler.js -s https://example.com --max-pages 250 -c 8
```

**Memory-Optimized Configuration:**

```bash
# For limited RAM environments
CATS_BROWSER_POOL_SIZE=1
CATS_DEFAULT_CRAWLER_CONCURRENCY=2
CATS_MAX_CONCURRENT_JOBS=1
CATS_BROWSER_MEMORY_LIMIT_MB=512
```

### ☁️ Cloud Storage Variables

```bash
CATS_USE_CLOUD_STORAGE=true       # Enable Google Cloud Storage
GOOGLE_CLOUD_PROJECT=your-project # GCP project ID
CATS_STORAGE_BUCKET=your-bucket   # GCS bucket name
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

### 🔧 Storage Locations

| Environment | Reports Location    | Access Method      |
| ----------- | ------------------- | ------------------ |
| Local Dev   | `./public/reports/` | Direct file system |
| Docker Dev  | `./public/reports/` | Volume mounted     |
| Cloud Run   | GCS bucket          | Public HTTPS URLs  |

## Notes about Docker Compose and local SASS workflows

When running via Docker Compose (the recommended dev environment), the Docker
image includes the compiled CSS that is generated during the image build (the
Dockerfile runs `npm run sass:build`). To avoid accidentally serving stale CSS
from your host you have two options:

- Use the image-baked assets (default): do not mount `./public/styles` into the
  container. This mirrors production: rebuild the image with
  `docker-compose up --build` to pick up SASS changes.

- Use a local edit-and-watch workflow (fast iteration): mount `./public/styles`
  into the container and run a SASS watcher locally that compiles `src/styles`
  into `public/styles` on your machine. The container will then serve the
  freshly compiled host CSS while you iterate.

Recommended local commands (from project root):

```bash
# install deps
npm install

# build once
npm run sass:build

# start SASS watcher (rebuilds CSS automatically on changes)
npm run sass:watch:local

# in another terminal, start the app (either locally or via compose)
docker-compose up --build
```

If you prefer the image-baked flow (no host mounts), remove the
`./public/styles:/app/public/styles` mount from `docker-compose.yml` and always
run `docker-compose up --build` after changing SASS files.

If you plan to use the dev compose override (`docker-compose.dev.yml`) the
recommended workflow is to run the SASS watcher on your host rather than inside
the container because the image prunes devDependencies during build. From the
project root:

```bash
npm install
npm run sass:watch:local   # run on host to compile into public/styles
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This way the container serves the host-compiled CSS while you iterate.

### Local Dev Workflows (recommended)

Two options are supported for local development — pick one that matches your
preferences.

- Host-watcher (safe & fast) — recommended for most contributors:

1.  Start the SASS watcher on your host:

    ```bash
    npm install
    npm run sass:watch:local
    ```

2.  Start the dev container with host mounts:

    ```bash
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
    ```

- All-in-container dev image (one-command) — useful when you want everything
  inside Docker:

  Start the one-command dev image (includes watcher + server, runs on port
  3333):

  ```bash
  npm run compose:dev
  # or the convenience script that starts host watcher + dev image:
  npm run dev:all
  ```

Notes:

- The dev image (`Dockerfile.dev`) keeps devDependencies so the in-container
  watcher can run, but the dev image is larger and intended only for local
  development.
- Editing package.json or adding native deps still requires rebuilding the dev
  image. SCSS changes do not.
