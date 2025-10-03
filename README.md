# 🐱 CATS (Crawl and Test System)

A modern accessibility testing platform for crawling websites and generating
actionable, beautiful reports. Built for developers, QA, and accessibility
professionals to ensure WCAG compliance with automated scanning and a web
dashboard.

## ✨ Key Features

- **Smart crawling** (sitemap or link discovery)
- **Automated axe-core accessibility testing** with comprehensive WCAG
  compliance
- **Interactive HTML reports** with detailed violation breakdowns
- **Modern template-based dashboard** for easy report management
- **High-performance crawling** with browser pooling and intelligent concurrency
- **Domain validation** prevents false-positive reports on invalid domains
- **Intelligent retry logic** with exponential backoff for reliability
- **Enhanced error handling** with detailed troubleshooting guidance
- **Flexible WCAG configuration** (2.0, 2.1, 2.2) with custom compliance levels
- **Production-ready scaling** optimized for government site accessibility
  testing
- **Responsive, accessible UI** following modern design principles

## 🚀 Quick Start

### Choose Your Environment

**🐳 Docker (Recommended for Testing)**

```bash
git clone https://github.com/iamjolly/crawl-and-test.git
cd crawl-and-test
docker compose -f docker-compose.yml up --build
# Visit http://localhost:3000 (production-like image)

# One-command dev image (includes dev tools, watcher + server on port 3333)
# Recommended for fast, all-in-container development:
npm run compose:dev
# Visit http://localhost:3333
```

**💻 Local Development**

```bash
git clone https://github.com/iamjolly/crawl-and-test.git
cd crawl-and-test
npm install
npm run install-browsers
npm run dev                # starts watcher + server (port 3000)

# One-step dev (watch on host + dev container)
# Starts host SASS watcher and dev container (port 3333):
npm run dev:all
# Visit http://localhost:3333
```

**☁️ Google Cloud Run (Production)** See
[CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md) for complete deployment guide.

### Prerequisites

- **Docker**: Docker Desktop for containerized development
- **Local**: Node.js 22+ and npm
- **Cloud**: Google Cloud account with billing enabled

## 💻 Usage

### Development Environments

**🐳 Docker Development**

```bash
# Start with Docker (includes all dependencies)
docker-compose up --build

# Stop the environment
docker-compose down
```

**💻 Local Development**

```bash
# Start development server (with file watching)
npm run dev

# Or start dashboard only
npm run serve
```

**Both environments provide:**

- Dashboard at [http://localhost:3000](http://localhost:3000)
- Real-time crawl monitoring
- Report browsing and generation
- Local file storage in `public/reports/`

### Command Line

```bash
npm start -- -s https://example.com --html
```

#### Essential options

| Option                    | Description                   | Default |
| ------------------------- | ----------------------------- | ------- |
| `-s, --seed <url>`        | Seed URL (HTTPS, validated)   | -       |
| `-d, --depth <num>`       | Crawl depth                   | 2       |
| `-c, --concurrency <num>` | Parallel browsers             | 4       |
| `-p, --max-pages <num>`   | Max pages (0 = unlimited)     | 25      |
| `--wcag-version <ver>`    | WCAG version (2.0, 2.1, 2.2)  | 2.1     |
| `--wcag-level <level>`    | Compliance level (A, AA, AAA) | AA      |
| `--html`                  | Generate HTML report          | false   |
| `--no-sitemap`            | Skip sitemap, use discovery   | false   |

#### Performance & Configuration

Environment variables for advanced configuration (see
[.env.example](./.env.example)):

| Variable                 | Description                        | Default          |
| ------------------------ | ---------------------------------- | ---------------- |
| `CATS_PAGE_TIMEOUT`      | Page navigation timeout (ms)       | 90000            |
| `CATS_MAX_RETRIES`       | Retry attempts for failed pages    | 3                |
| `CATS_BROWSER_POOL_SIZE` | Browser instance pool size         | 2                |
| `CATS_WAIT_STRATEGY`     | Page wait strategy                 | domcontentloaded |
| `CATS_DISABLE_IMAGES`    | Disable images for faster scanning | true             |

## ⚡ Performance Optimizations

CATS is optimized for large-scale accessibility testing with enterprise-grade
performance features:

### 🚀 **High-Performance Crawling**

- **Browser pooling** - Reuses browser instances for 10x faster page loading
- **Intelligent concurrency** - Adaptive parallel processing based on system
  resources
- **Memory management** - Automatic cleanup prevents memory leaks during long
  crawls
- **Optimized timeouts** - Extended timeouts (90s) handle slow government sites
  reliably

### 🛡️ **Reliability Features**

- **Domain validation** - Validates domains before crawling to prevent
  false-positive reports
- **Retry logic** - 3 attempts with exponential backoff for failed pages
- **Early exit detection** - Stops crawling when domains are consistently
  unreachable
- **Enhanced error handling** - Detailed troubleshooting guidance for common
  issues

### 📈 **Scalability**

- **Production-tested** - Handles 250+ page crawls with concurrency up to 8
- **Cloud Run optimized** - 8Gi RAM, 4 CPU configuration for enterprise
  workloads
- **Cost-efficient** - Scales to zero when not in use, pay-per-use pricing

### 🔧 **Configuration Examples**

```bash
# High-performance crawl (250+ pages)
CATS_MAX_PAGES=250
CATS_DEFAULT_CRAWLER_CONCURRENCY=8
CATS_PAGE_TIMEOUT=90000
CATS_BROWSER_POOL_SIZE=4

# Memory-optimized for large crawls
CATS_DISABLE_IMAGES=true
CATS_WAIT_STRATEGY=domcontentloaded
CATS_MAX_RETRIES=3
```

## 📊 Reports

- Find reports in `public/reports/`
- Each domain has its own folder
- Reports include summary stats, violation breakdowns, and detailed issues
- View in dashboard or open HTML files directly

## 📚 Documentation

| Document                                     | Description                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| [CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md) | **Google Cloud Run deployment guide** - Production setup, costs, scaling |
| [DEVELOPMENT.md](./DEVELOPMENT.md)           | **Development workflows** - Build scripts, local setup, configuration    |
| [EXAMPLES.md](./EXAMPLES.md)                 | **Usage examples** - CLI commands, configuration options, workflows      |

### Quick References

- **Docker Commands**: See [docker-compose.yml](./docker-compose.yml) for local
  development
- **Environment Variables**: See [.env.example](./.env.example) for all
  configuration options
- **Cloud Credentials**: See Google Cloud setup section below

## Web Dashboard

The web dashboard provides a user-friendly interface for managing accessibility
scans:

### Start the Dashboard

```bash
npm run dev

# or

npm run serve
```

**URL**: <http://localhost:3000>

### Dashboard Features

- **Start New Crawls**: Simple form interface with all configuration options
- **Monitor Progress**: Real-time job tracking with progress indicators
- **Browse Reports**: Organized view of all reports by domain
- **Search & Filter**: Find specific reports quickly
- **Report Navigation**: Seamless navigation between dashboard and individual
  reports

### Template System

The dashboard uses a modern template-based architecture for clean separation of
concerns:

**Template Features:**

- **Modular Design**: Reusable components for consistent UI
- **Template Engine**: Simple placeholder replacement system (`{{variable}}`)
- **Error Handling**: Graceful fallbacks for missing templates
- **Performance**: Templates loaded once and cached

**Key Templates:**

- `reports-index.html` - Main reports listing page
- `domain-reports.html` - Domain-specific reports browser
- `error-404.html` - Error pages with consistent styling
- `base.html`, `report-base.html` - Report viewer templates

**For Developers:**

- Templates are located in `src/templates/`
- Dashboard uses `loadTemplate()` and `renderTemplate()` utilities
- All dashboard pages now use templates instead of inline HTML
- Easy to customize styling and layout without touching server logic

## ☁️ Google Cloud Setup

### Authentication & Credentials

**For Local Development with Cloud Storage:**

```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash

# Authenticate with your Google account
gcloud auth login
gcloud auth application-default login

# Set your project
gcloud config set project YOUR-PROJECT-ID
```

**For Production Deployment:**

```bash
# Service Account (recommended for CI/CD)
gcloud iam service-accounts create cats-service-account
gcloud projects add-iam-policy-binding YOUR-PROJECT-ID \
  --member="serviceAccount:cats-service-account@YOUR-PROJECT-ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Download service account key
gcloud iam service-accounts keys create ./service-account-key.json \
  --iam-account=cats-service-account@YOUR-PROJECT-ID.iam.gserviceaccount.com
```

**Environment Variables:**

```bash
# For local development
cp .env.example .env

# Edit .env with your settings:
CATS_USE_CLOUD_STORAGE=true
GOOGLE_CLOUD_PROJECT=your-project-id
CATS_STORAGE_BUCKET=your-bucket-name

# For service account authentication (optional)
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

### Cost Estimates

| Usage            | Environment        | Monthly Cost | Performance Notes                                 |
| ---------------- | ------------------ | ------------ | ------------------------------------------------- |
| POC Testing      | 1,500 pages/week   | $5-9         | Scales to zero, browser pooling optimized         |
| Small Business   | 10,000 pages/week  | $20-30       | ~25% cost reduction from efficiency improvements  |
| Enterprise       | 100,000 pages/week | $50-70       | High-performance crawling, 8 concurrent browsers  |
| Large Enterprise | 500,000 pages/week | $200-300     | Auto-scaling, memory optimized for 24/7 operation |

_Costs include compute, storage, and data transfer on Google Cloud Run.
Performance optimizations reduce costs by ~25% through improved efficiency and
browser pooling._

## Contributing

We welcome contributions! Please see our
[Contributing Guidelines](.github/CONTRIBUTING.md) for detailed information.

### Quick Start for Contributors

1. **Fork** the repository
2. **Clone** your fork:
   `git clone https://github.com/YOUR_USERNAME/crawl-and-test.git`
3. **Install dependencies**: `npm install`
4. **Create a feature branch**: `git checkout -b feature/your-feature-name`
5. **Make your changes**
6. **Run tests**: `npm test`
7. **Run linting**: `npm run lint:fix`
8. **Commit using conventional commits**:
   `git commit -m "feat: add new feature"`
9. **Push and create a PR**

### Code Quality

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for testing
- **Husky** for pre-commit hooks
- **GitHub Actions** for CI/CD

All PRs must pass:

- ✅ All tests
- ✅ Linting checks
- ✅ Security scanning
- ✅ Code review

## License

MIT License - See LICENSE file for details.

---

Made with ❤️ for web accessibility
