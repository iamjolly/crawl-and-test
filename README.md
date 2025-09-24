# 🐱 CATS (Crawl and Test System)

A modern accessibility testing platform for crawling websites and generating
actionable, beautiful reports. Built for developers, QA, and accessibility
professionals to ensure WCAG compliance with automated scanning and a web
dashboard.

## ✨ Key Features

- Smart crawling (sitemap or link discovery)
- Automated axe-core accessibility testing
- Interactive HTML reports
- Modern template-based dashboard
- Fast, concurrent crawling
- Flexible WCAG configuration
- Responsive, accessible UI

## 🚀 Quick Start

### Choose Your Environment

**🐳 Docker (Recommended for Testing)**
```bash
git clone https://github.com/iamjolly/crawl-and-test.git
cd crawl-and-test
docker-compose up --build
# Visit http://localhost:3000
```

**💻 Local Development**
```bash
git clone https://github.com/iamjolly/crawl-and-test.git
cd crawl-and-test
npm install
npm run install-browsers
npm run dev
# Visit http://localhost:3000
```

**☁️ Google Cloud Run (Production)**
See [CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md) for complete deployment guide.

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

| Option                    | Description          | Default |
| ------------------------- | -------------------- | ------- |
| `-s, --seed <url>`        | Seed URL (HTTPS)     | -       |
| `-d, --depth <num>`       | Crawl depth          | 2       |
| `-c, --concurrency <num>` | Parallel browsers    | 4       |
| `-p, --max-pages <num>`   | Max pages            | 25      |
| `--wcag-version <ver>`    | WCAG version         | 2.1     |
| `--wcag-level <level>`    | Compliance level     | AA      |
| `--html`                  | Generate HTML report | false   |

## 📊 Reports

- Find reports in `public/reports/`
- Each domain has its own folder
- Reports include summary stats, violation breakdowns, and detailed issues
- View in dashboard or open HTML files directly

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CLOUD_DEPLOYMENT.md](./CLOUD_DEPLOYMENT.md) | **Google Cloud Run deployment guide** - Production setup, costs, scaling |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | **Development workflows** - Build scripts, local setup, configuration |
| [EXAMPLES.md](./EXAMPLES.md) | **Usage examples** - CLI commands, configuration options, workflows |

### Quick References

- **Docker Commands**: See [docker-compose.yml](./docker-compose.yml) for local development
- **Environment Variables**: See [.env.example](./.env.example) for all configuration options
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

| Usage | Environment | Monthly Cost |
|-------|-------------|--------------|
| POC Testing | 1,500 pages/week | $5-9 |
| Small Business | 10,000 pages/week | $25-35 |
| Enterprise | 100,000 pages/week | $60-85 |

*Costs include compute, storage, and data transfer on Google Cloud Run*

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
