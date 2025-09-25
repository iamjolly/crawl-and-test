# Development & Build Scripts

This document contains all build, development, and configuration scripts for
CATS, including Docker development workflows and cloud deployment.

## 🚀 Development Environments

### 🐳 Docker Development (Recommended)

**Quick Start:**
```bash
# Build and start the development environment
docker-compose up --build

# Stop the environment
docker-compose down

# Rebuild after code changes
docker-compose up --build --force-recreate
```

**Benefits:**
- ✅ Consistent environment across all machines
- ✅ No local Node.js/Playwright setup required
- ✅ Includes all system dependencies
- ✅ Matches production environment exactly

**Docker Commands:**
| Command | Description |
|---------|-------------|
| `docker-compose up` | Start development environment |
| `docker-compose up --build` | Rebuild and start |
| `docker-compose down` | Stop and remove containers |
| `docker-compose logs` | View application logs |
| `docker-compose exec cats-app bash` | Shell into running container |

### 💻 Local Development

**Setup:**
```bash
npm install
npm run install-browsers
npm run dev
```

**Benefits:**
- ✅ Faster iteration for code changes
- ✅ Direct file system access
- ✅ Use local IDE debugging tools
- ✅ No Docker overhead

## Build & Development Scripts

| Command                    | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| `npm run dev`              | Start development workflow: watch SASS + serve dashboard (port 3000) |
| `npm run serve`            | Start dashboard server only (port 3000)                              |
| `npm run serve:reports`    | Alternative alias for dashboard server (compatibility)               |
| `npm run serve:dashboard`  | Alternative alias for dashboard server (compatibility)               |
| `npm run build`            | Complete build: compile SASS + generate HTML reports                 |
| `npm run build:prod`       | Production build: compile SASS + optimize CSS + generate HTML        |
| `npm run build:domain`     | Generate reports for specific domain                                 |
| `npm run sass:build`       | Compile all SASS files (design system + legacy + report styles)      |
| `npm run sass:watch`       | Watch and compile SASS files during development                      |
| `npm run css:optimize`     | Optimize all CSS files using PostCSS/cssnano                         |
| `npm run html:build`       | Generate HTML reports from existing JSON data                        |
| `npm run clean`            | Remove all generated reports and CSS files                           |
| `npm run install-browsers` | Install Playwright browsers                                          |

### SASS Build Scripts

| Command                            | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| `npm run sass:design-system`       | Compile design system SASS to compressed CSS |
| `npm run sass:legacy-compat`       | Compile legacy compatibility styles          |
| `npm run sass:report`              | Compile report-specific styles               |
| `npm run sass:design-system:watch` | Watch design system SASS files               |
| `npm run sass:legacy-compat:watch` | Watch legacy compatibility SASS files        |
| `npm run sass:report:watch`        | Watch report SASS files                      |

### CSS Optimization Scripts

| Command                              | Description                             |
| ------------------------------------ | --------------------------------------- |
| `npm run css:optimize:design-system` | Optimize design system CSS with PostCSS |
| `npm run css:optimize:report`        | Optimize report CSS with PostCSS        |
| `npm run css:optimize:legacy`        | Optimize legacy CSS with PostCSS        |

### Container & Deployment Scripts

| Command | Description |
|---------|-------------|
| `docker-compose up --build` | **Recommended**: Build and start Docker development environment |
| `docker build -t cats .` | Build Docker image manually |
| `docker run -p 3000:3000 cats` | Run Docker container manually |
| `gcloud builds submit` | Deploy to Google Cloud Run using cloudbuild.yaml |

### Testing & Quality Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint on src/ directory |
| `npm run lint:fix` | Run ESLint with automatic fixes |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## Environment Variables

See `.env.example` for all supported variables.

### 🏠 Local Development Variables
```bash
CATS_SERVER_PORT=3000              # Dashboard server port
CATS_SERVER_HOST=localhost         # Server bind address
CATS_MAX_PAGES=25                 # Max pages per crawl
CATS_WCAG_VERSION=2.1             # WCAG version (2.0, 2.1, 2.2)
CATS_WCAG_LEVEL=AA                # WCAG level (A, AA, AAA)
```

### 🐳 Docker Development Variables
```bash
# Set in docker-compose.yml or .env
CATS_SERVER_HOST=0.0.0.0          # Allow external connections
PORT=3000                         # Container port mapping
```

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
| Environment | Reports Location | Access Method |
|-------------|------------------|---------------|
| Local Dev | `./public/reports/` | Direct file system |
| Docker Dev | `./public/reports/` | Volume mounted |
| Cloud Run | GCS bucket | Public HTTPS URLs |
