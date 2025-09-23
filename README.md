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

### Prerequisites

- Node.js 22+
- npm or yarn

### Installation

```bash
git clone https://github.com/iamjolly/crawl-and-test.git
cd crawl-and-test
npm install
npm run install-browsers
```

## 💻 Usage

### Running the Dashboard

- Start: `npm run dev` (or `npm run serve`)
- URL: [http://localhost:3000](http://localhost:3000)
- Features: Start scans, monitor progress, browse reports

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

## Documentation & Details

See [EXAMPLES.md](./EXAMPLES.md), and [DEVELOPMENT.md](./DEVELOPMENT.md) for:

- Full folder structure
- Dashboard features & template system
- All CLI usage examples
- Build scripts & advanced configuration

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
