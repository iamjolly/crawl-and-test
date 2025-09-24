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

## Advanced Usage

- Regenerate HTML reports from JSON: `npm run build`
- Serve dashboard: `npm run dev`
- Clean generated reports: `npm run clean`
- See all options: `npm start -- --help`

## Troubleshooting

- **Failed to launch browser**: `npm run install-browsers`
- **HTTPS required**: Use `https://` URLs
- **Timeout errors**: Increase delay (`-t 2000`), reduce concurrency (`-c 2`)
- **Large output files**: Limit pages (`-p 50`), reduce depth (`-d 1`)
