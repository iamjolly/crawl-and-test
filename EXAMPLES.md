# CLI & Usage Examples

This document contains comprehensive usage examples for CATS across different
environments: Docker, local development, and Google Cloud Run.

## 🐳 Docker Examples

### Start Development Environment
```bash
# Quick start with Docker
docker-compose up --build

# Visit dashboard at http://localhost:3000
# Reports saved to ./public/reports/
```

### Docker with Custom Configuration
```bash
# Create custom environment file
cp .env.example .env

# Edit .env with your settings
CATS_MAX_PAGES=50
CATS_WCAG_VERSION=2.2
CATS_WCAG_LEVEL=AAA

# Start with custom config
docker-compose up --build
```

### Run CLI Commands in Docker
```bash
# Execute crawler inside Docker container
docker-compose exec cats-app node src/core/crawler.js -s https://example.com --html

# Access container shell for debugging
docker-compose exec cats-app bash
```

## ☁️ Google Cloud Run Examples

### Deploy to Production
```bash
# Set your project
export PROJECT_ID=your-gcp-project

# Deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_STORAGE_BUCKET=cats-reports-$PROJECT_ID

# Access your deployed service
gcloud run services describe cats-accessibility-crawler \
  --region=us-central1 --format="value(status.url)"
```

### Update Environment Variables
```bash
# Update crawler configuration
gcloud run services update cats-accessibility-crawler \
  --region=us-central1 \
  --set-env-vars="CATS_MAX_PAGES=100,CATS_WCAG_VERSION=2.2"

# Enable debug logging
gcloud run services update cats-accessibility-crawler \
  --region=us-central1 \
  --set-env-vars="NODE_ENV=development"
```

### Scale Cloud Run Service
```bash
# Increase capacity for high traffic
gcloud run services update cats-accessibility-crawler \
  --region=us-central1 \
  --memory=8Gi \
  --cpu=4 \
  --max-instances=20

# Set minimum instances to reduce cold starts
gcloud run services update cats-accessibility-crawler \
  --region=us-central1 \
  --min-instances=1
```

## 💻 Local Development Examples

### Command Line Examples

### Basic scan with HTML report

```bash
npm start -- -s https://example.com --html
```

### Direct crawler usage

```bash
node src/core/crawler.js -s https://example.com --html
```

### Comprehensive scan with custom settings

```bash
npm start -- -s https://example.com -d 3 -c 4 --wcag-version 2.1 --wcag-level AA --html
```

### Conservative scan for testing

```bash
node src/core/crawler.js -s https://example.com -c 1 -t 2000 -d 1 --html
```

### Balanced production scan

```bash
node src/core/crawler.js -s https://example.com -d 2 -c 4 -t 1000 --wcag-version 2.1 --wcag-level AA --html
```

### Large site scan

```bash
node src/core/crawler.js -s https://large-site.com -p 100 -d 3 -c 2 --html
```

### Latest WCAG 2.2 compliance

```bash
node src/core/crawler.js -s https://example.com --wcag-version 2.2 --wcag-level AA --html
```

## ⚡ High-Performance Examples

### Enterprise-Scale Crawl (250+ pages)

**Command Line:**
```bash
# High-performance crawl with optimized settings
node src/core/crawler.js \
  -s https://large-enterprise.com \
  --max-pages 250 \
  --concurrency 8 \
  --html
```

**With Environment Variables:**
```bash
# Set performance optimizations
export CATS_PAGE_TIMEOUT=90000
export CATS_BROWSER_POOL_SIZE=4
export CATS_MAX_RETRIES=3
export CATS_DISABLE_IMAGES=true

# Run enterprise crawl
npm start -- -s https://gov-site.com --max-pages 500 -c 8 --html
```

### Government Site Optimization

```bash
# Optimized for slow government websites
CATS_PAGE_TIMEOUT=120000 \
CATS_WAIT_STRATEGY=domcontentloaded \
CATS_DISABLE_IMAGES=true \
CATS_MAX_RETRIES=5 \
  node src/core/crawler.js -s https://state.gov.us --max-pages 100 -c 4 --html
```

### Memory-Optimized for Limited Resources

```bash
# Reduced memory footprint
CATS_BROWSER_POOL_SIZE=1 \
CATS_DEFAULT_CRAWLER_CONCURRENCY=2 \
CATS_BROWSER_MEMORY_LIMIT_MB=512 \
  node src/core/crawler.js -s https://example.com --max-pages 50 -c 2 --html
```

### Domain Validation Examples

**Valid Domain:**
```bash
# Will proceed with crawl
node src/core/crawler.js -s https://github.com --max-pages 10
```

**Invalid Domain (shows proper error):**
```bash
# Will fail with helpful error message
node src/core/crawler.js -s https://invalid-domain-that-does-not-exist.com
# Output: ❌ Domain "invalid-domain-that-does-not-exist.com" does not exist...
```

### Cloud Run Performance Testing

**Local simulation of Cloud Run performance:**
```bash
# Simulate Cloud Run environment locally
CATS_SERVER_HOST=0.0.0.0 \
CATS_MAX_CONCURRENT_JOBS=1 \
CATS_DEFAULT_CRAWLER_CONCURRENCY=2 \
CATS_PAGE_TIMEOUT=90000 \
CATS_BROWSER_POOL_SIZE=2 \
  npm run serve
```

### Performance Monitoring

**Enable detailed logging:**
```bash
# Run with performance logging
NODE_ENV=development \
CATS_BROWSER_POOL_SIZE=4 \
  node src/core/crawler.js -s https://example.com --max-pages 100 -c 6 --html
```

## Advanced Usage

- Regenerate HTML reports from JSON: `npm run build`
- Serve dashboard: `npm run dev`
- Clean generated reports: `npm run clean`
- See all options: `npm start -- --help`

## Troubleshooting

### Common Issues

- **Failed to launch browser**: `npm run install-browsers`
- **HTTPS required**: Use `https://` URLs
- **Timeout errors**: Increase `CATS_PAGE_TIMEOUT=120000`, reduce concurrency (`-c 2`)
- **Large output files**: Limit pages (`-p 50`), reduce depth (`-d 1`)

### Domain Validation Errors

- **"Domain does not exist"**: Verify domain spelling, try with `www` prefix
- **DNS resolution failed**: Check domain exists with `nslookup domain.com`
- **Network timeout**: Increase `CATS_PAGE_TIMEOUT` for slow sites
- **False-positive prevention**: Domain validation now prevents invalid crawls

### Performance Issues

- **Memory errors**: Reduce `CATS_BROWSER_POOL_SIZE=1` and concurrency
- **Slow crawls**: Enable `CATS_DISABLE_IMAGES=true`, use `CATS_WAIT_STRATEGY=domcontentloaded`
- **Retry failures**: Increase `CATS_MAX_RETRIES=5` for unreliable sites
