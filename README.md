# 🐱 CATS (Crawl and Test System)

A modern web accessibility testing plat│       └── cleanup.js              # Cleanup utilities
├── 📁 public/                       # Generated output (served by dashboard)
│   ├── 📊 reports/                  # Generated accessibility reports
│   ├── 🎨 styles/                   # Copied CSS files
│   └── 📜 scripts/                  # Copied JavaScript files
├── � _serverless-examples/         # Cloud deployment examples
└── � Configuration files           # package.json, .env.example, etc.at crawls websites and generates beautiful, actionable accessibility reports. CATS helps developers, QA teams, and accessibility professionals ensure their websites meet WCAG compliance standards with automated scanning and comprehensive reporting.

## ✨ Key Features

- 🌐 **Smart Crawling**: Automatically detects sitemaps or discovers pages through link crawling
- ♿ **Comprehensive Testing**: Uses axe-core for industry-standard accessibility scanning
- 📊 **Beautiful Reports**: Interactive HTML reports with detailed violation breakdowns
- 🎯 **Web Dashboard**: Browser-based interface for managing scans and browsing reports
- ⚡ **High Performance**: Concurrent crawling with configurable limits and delays
- 🔧 **Flexible Configuration**: Support for WCAG 2.0/2.1/2.2 and A/AA/AAA compliance levels
- 📱 **Modern UI**: Responsive design with navigation, breadcrumbs, and accessibility features

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd crawl-and-test

# Install Node.js dependencies
npm install

# Install browser for crawling
npm run install-browsers
```

### 2. Start the Web Dashboard

```bash
npm run dev
```

Open **http://localhost:3000** and use the web interface to start your first accessibility scan!

### 3. Or Use Command Line

```bash
# Basic scan with HTML report using npm script
npm start -- -s https://example.com --html

# Or use the crawler directly
node src/core/crawler.js -s https://example.com --html

# View reports at http://localhost:3001
npm run serve:reports
```

## 📋 Prerequisites

- **Node.js** 16.0.0 or higher
- **npm** or yarn package manager
- **Internet connection** for crawling websites

## 🏗️ Project Structure

```
├── 📁 src/                          # Source files and application code
│   ├── 🔧 core/                     # Core functionality
│   │   ├── config.js               # Configuration management
│   │   └── crawler.js              # Main accessibility crawler
│   ├── 🌐 servers/                  # Server applications
│   │   ├── dashboard.js            # Web dashboard server
│   │   └── static.js               # Static report viewer server
│   ├── 📝 generators/               # Report generation utilities
│   │   ├── html.js                 # HTML report generator
│   │   └── index.js                # Dashboard index generator
│   ├── 🎨 styles/                   # CSS stylesheets
│   ├── 📜 scripts/                  # JavaScript utilities
│   ├── 📄 templates/                # HTML templates
│   └── 🛠️ utils/                    # Utility scripts
│       └── cleanup.js              # Cleanup utilities
├── 📁 public/                       # Generated output (served by dashboard)
│   ├── 📊 reports/                  # Generated accessibility reports
│   ├── 🎨 styles/                   # Copied CSS files
│   └── 📜 scripts/                  # Copied JavaScript files
├── � serverless-examples/          # Cloud deployment examples
└── � Configuration files           # package.json, .env.example, etc.
```

## 🌐 Web Dashboard

The web dashboard provides a user-friendly interface for managing accessibility scans:

### Start the Dashboard

```bash
npm run dev
# or
npm run serve:dashboard
```

**URL**: http://localhost:3000

### Dashboard Features

- 🚀 **Start New Crawls**: Simple form interface with all configuration options
- 📈 **Monitor Progress**: Real-time job tracking with progress indicators  
- 📂 **Browse Reports**: Organized view of all reports by domain
- 🔍 **Search & Filter**: Find specific reports quickly
- 📊 **Report Navigation**: Seamless navigation between dashboard and individual reports

## 📊 Static Report Viewer

For sharing reports or viewing without the dashboard:

```bash
npm run serve:reports
```

**URL**: http://localhost:3001

Serves all generated reports from the `public/` directory with a clean, browsable interface.

## 🛠️ Command Line Usage

### Basic Commands

```bash
# Recommended: Use npm scripts (works from any directory)
npm start -- -s https://example.com --html

# Or run directly (from project root)
node src/core/crawler.js -s https://example.com --html

# Comprehensive scan with custom settings  
npm start -- -s https://example.com -d 3 -c 4 --wcag-version 2.1 --wcag-level AA --html

# Check available options
npm start -- --help
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --seed <url>` | Seed URL (required, must be HTTPS) | - |
| `-d, --depth <num>` | Maximum crawl depth | 2 |
| `-c, --concurrency <num>` | Parallel browsers | 4 |
| `-o, --output <file>` | Output JSON filename | auto-generated |
| `-t, --delay <ms>` | Delay between requests (ms) | 1000 |
| `-p, --max-pages <num>` | Max pages (0 = unlimited) | 25 |
| `--no-sitemap` | Skip sitemap, use link discovery only | false |
| `--wcag-version <ver>` | WCAG version (2.0, 2.1, 2.2) | 2.1 |
| `--wcag-level <level>` | Compliance level (A, AA, AAA) | AA |
| `--html` | Generate HTML report | false |

### Example Commands

```bash
# Conservative scan for testing
node crawler.js -s https://example.com -c 1 -t 2000 -d 1 --html

# Balanced production scan
node crawler.js -s https://example.com -d 2 -c 4 -t 1000 --wcag-version 2.1 --wcag-level AA --html

# Comprehensive large site scan
node crawler.js -s https://large-site.com -p 100 -d 3 -c 2 --html

# Latest WCAG 2.2 compliance
node crawler.js -s https://example.com --wcag-version 2.2 --wcag-level AA --html
```

## 🔧 Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web dashboard (port 3000) |
| `npm run serve:reports` | Start static report viewer (port 3001) |
| `npm run build` | Generate HTML reports from JSON data |
| `npm run regenerate-html` | Regenerate missing HTML reports |
| `npm run clean` | Remove all generated reports |
| `npm run install-browsers` | Install Playwright browsers |

## ⚙️ Configuration

### Environment Variables (.env Support)

The project supports automatic `.env` file loading for easy configuration. Copy `.env.example` to `.env` to customize directories and settings:

```bash
cp .env.example .env
```

**Environment variables override all default values**, making it easy to customize the system for your environment.

Key configuration options:
- `CATS_SERVER_PORT`: Dashboard server port (default: 3000)
- `CATS_PUBLIC_DIR`: Output directory for reports (default: public/)
- `CATS_REPORTS_DIR`: Reports storage location (default: public/reports/)
- `CATS_MAX_PAGES`: Maximum pages to crawl (default: 25)
- `CATS_WCAG_VERSION`: WCAG version (default: 2.1)
- `CATS_WCAG_LEVEL`: WCAG level (default: AA)

### WCAG Testing Standards

**WCAG Versions:**
- `2.0` - Legacy standard
- `2.1` - Widely adopted (default)
- `2.2` - Latest standard

**Compliance Levels:**
- `A` - Basic accessibility
- `AA` - Standard compliance (recommended)
- `AAA` - Enhanced accessibility

## 📈 How It Works

1. **🕷️ Crawling**: Discovers pages via sitemap.xml or link crawling
2. **🔍 Scanning**: Runs axe-core accessibility tests on each page
3. **📊 Reporting**: Generates JSON data and beautiful HTML reports
4. **🌐 Serving**: Makes reports available via web dashboard or static server

## 🔍 Smart Crawling Modes

### Mixed Mode (Default)
1. **Tries sitemap.xml** at common locations
2. **Falls back to discovery** crawling if no sitemap found
3. **Respects robots.txt** automatically

### Discovery Only
```bash
node src/core/crawler.js -s https://example.com --no-sitemap
```

Uses link discovery with depth limits instead of sitemap.

## 📊 Report Features

### Generated Reports Include:
- 📈 **Summary Statistics**: Total issues, pages scanned, compliance overview
- 🎯 **Violation Breakdown**: Grouped by severity and type
- � **Detailed Issues**: Specific elements, selectors, and remediation guidance
- 🔗 **Page-by-Page Results**: Complete scan results for each URL
- � **Multiple Formats**: Both JSON (raw data) and HTML (visual reports)

### Report Organization:
```
public/reports/
├── example.com/
│   ├── example.com_wcag2.1_AA_2025-09-16T10-30-15.html
│   ├── example.com_wcag2.1_AA_2025-09-16T10-30-15.json
│   └── ...
└── another-site.org/
    └── ...
```

## 🚨 Troubleshooting

### Common Issues

**"Failed to launch browser"**
```bash
npm run install-browsers
```

**"HTTPS required" error**
- Ensure your seed URL starts with `https://`

**Timeout errors**
- Increase delay: `-t 2000`
- Reduce concurrency: `-c 2`

**Large output files**
- Limit pages: `-p 50`
- Reduce depth: `-d 1`

### Performance Tuning

```bash
# Conservative (safe for any site)
node crawler.js -s https://site.com -c 1 -t 2000 -d 2

# Balanced (recommended)
node crawler.js -s https://site.com -c 4 -t 1000 -d 2

# Aggressive (use with caution)
node crawler.js -s https://site.com -c 8 -t 500 -d 3
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details.

---

**Made with ❤️ for web accessibility**

**Features**:
- 📖 **Browse reports**: Clean directory interface for all generated accessibility reports
- ⬇️ **Download data**: Direct access to both HTML reports and raw JSON data
- 🚀 **Fast serving**: Optimized static file serving of the `/public/` directory
- 📱 **Responsive**: Modern, accessible interface for report browsing

**Use Cases**:
- **Dashboard** (`npm run dev`): Active development, creating new scans, managing crawls
- **Report Viewer** (`npm run serve:reports`): Sharing reports, presentations, reviewing completed scans

## Build & Development Workflow

### Generate Reports

Build all HTML reports from existing JSON data:

```bash
npm run build
```

Generate reports for a specific domain:

```bash
npm run build:domain example.com
```

Clean generated reports:

```bash
npm run clean
```

### Serve Generated Reports

Start a static server to browse generated reports:

```bash
npm run serve:reports
```

This starts a server at `http://localhost:3001` serving the `public/` directory with a browsable interface for all generated accessibility reports.

### Development Scripts

- `npm run dev` (or `npm run serve:dashboard`) - Start the crawling dashboard (port 3000)
- `npm run serve:reports` - Serve generated reports in static viewer (port 3001)
- `npm run build` - Generate all HTML reports
- `npm run clean` - Clean generated reports
- `npm run cleanup-old-html` - Remove old HTML files from /reports/, preserving JSON data

## Data Flow

1. **Crawling**: `crawler.js` scans websites → Saves raw JSON data to `/reports/`
2. **Generation**: `regenerate-html.js` reads JSON from `/reports/` → Generates modern HTML + copies JSON to `/public/reports/`
3. **Serving**: `serve-public.js` serves the `/public/` directory for browsing reports

Each domain directory in `/public/reports/` contains:
- **HTML files**: Modern, accessible report viewer with expand/collapse functionality
- **JSON files**: Raw axe-core scan data, downloadable directly from HTML reports

The `/reports/` directory contains the **source data** (raw axe-core JSON results) and should be preserved. The `/public/reports/` directory contains the **generated output** (modern HTML reports + JSON copies) and can be rebuilt at any time using `npm run build`.

## Usage

> **Note**: All command examples below show `node crawler.js` for clarity, but we recommend using `npm start --` instead as it works from any directory. For example: `npm start -- -s https://example.com`

### Basic Usage

Crawl a website starting from a seed URL:

```bash
node crawler.js -s https://example.com
```

### Command Line Options

```bash
node crawler.js [options]

Options:
  -s, --seed <url>          Seed URL (must be HTTPS) [required]
  -d, --depth <num>         Maximum crawl depth (default: 2)
  -c, --concurrency <num>   Number of parallel browsers (default: 4)
  -o, --output <file>       Output JSON file (default: "report.json")
  -t, --delay <ms>          Delay between requests per domain in ms (default: 1000)
  -p, --max-pages <num>     Maximum number of pages to scan (use 0 for unlimited, default: 50)
  --no-sitemap              Skip sitemap discovery and use only link crawling
  --wcag-version <version>  WCAG version to test: 2.0, 2.1, 2.2 (default: "2.1")
  --wcag-level <level>      WCAG compliance level: A, AA, AAA (default: "AA")
  --custom-tags <tags>      Custom axe tags (comma-separated, overrides WCAG options)
  --html                    Generate HTML report in addition to JSON
  -h, --help                Display help for command
```

### Examples

**Basic crawl with default settings:**
```bash
node crawler.js -s https://example.com
```

**Deep crawl with custom output:**
```bash
node crawler.js -s https://example.com -d 3 -o accessibility-report.json
```

**High-performance crawl (use with caution):**
```bash
node crawler.js -s https://example.com -c 8 -t 500 -d 2
```

**Conservative crawl for testing:**
```bash
node crawler.js -s https://example.com -c 1 -t 2000 -d 1
```

**Quick test scan (limit to 10 pages):**
```bash
node crawler.js -s https://example.com -p 10 -d 2
```

**Testing large sites (limit to 100 pages):**
```bash
node crawler.js -s https://large-site.com -p 100 -d 3 -c 2
```

**Unlimited scan (scan all discoverable pages):**
```bash
node crawler.js -s https://small-site.com -p 0 -d 2
```

## Output Format

The crawler generates a JSON report with the following structure:

```json
[
  {
    "pageUrl": "https://example.com",
    "pageTitle": "Example Domain",
    "timestamp": "2023-XX-XXTXX:XX:XX.XXXZ",
    "violations": [...],
    "passes": [...],
    "incomplete": [...],
    "inapplicable": [...]
  }
]
```

### Report Fields

- **pageUrl**: The URL of the scanned page
- **pageTitle**: The HTML title of the scanned page (captured automatically)
- **timestamp**: When the scan was performed
- **violations**: Accessibility issues found
- **passes**: Tests that passed
- **incomplete**: Tests that couldn't be completed
- **inapplicable**: Tests that don't apply to the page

## Configuration Tips

### Crawl Depth
- **Depth 1**: Only the seed URL
- **Depth 2**: Seed URL + direct links (recommended for most sites)
- **Depth 3+**: Use with caution on large sites

### Max Pages Limit
- **5-10**: Quick testing, proof of concept
- **25-50**: Default, good for most sites
- **100+**: Large sites, comprehensive testing
- **0 (Unlimited)**: Scan all discoverable pages (use with caution on large sites)
- **Note**: Prevents accidentally scanning thousands of pages from large sitemaps

### Concurrency
- **1-2**: Conservative, good for testing
- **4**: Default, balanced performance
- **8+**: High performance, but may trigger rate limiting

### Delay
- **2000ms+**: Very polite, good for production sites
- **1000ms**: Default, reasonable for most sites
- **500ms**: Faster crawling, use with permission

## Best Practices

1. **Start Small**: Begin with depth 1 and low concurrency to test
2. **Respect Rate Limits**: Use appropriate delays for the target site
3. **Check robots.txt**: The crawler respects robots.txt automatically
4. **Monitor Resources**: Large crawls can consume significant system resources
5. **Review Output**: Always review the generated reports for actionable insights

## HTML Report Utilities

### Regenerating HTML Reports

If HTML reports are missing (due to older crawls run without the `--html` flag), you can regenerate them from existing JSON data using the built-in utility:

```bash
```bash
# Regenerate all missing HTML reports
npm run build

# Or run directly
node src/generators/html.js
```

### Advanced Usage

```bash
# Regenerate HTML reports for a specific domain only
node src/generators/html.js --domain example.com

# Regenerate HTML for a specific JSON file
node src/generators/html.js --file reports/example.com/example.com_wcag2.1_AA_2025-09-14T10-03-03.json

# Force regenerate ALL reports with enhanced detailed information (even if HTML exists)
node src/generators/html.js --detailed
```
```

### Advanced Usage

```bash
# Regenerate HTML reports for a specific domain only
node regenerate-html.js --domain example.com

# Regenerate HTML for a specific JSON file
node regenerate-html.js --file reports/example.com/example.com_wcag2.1_AA_2025-09-14T10-03-03.json

# Force regenerate ALL reports with enhanced detailed information (even if HTML exists)
node regenerate-html.js --detailed

# Force detailed regeneration for specific domain
node regenerate-html.js --detailed --domain example.com

# Or use the npm script
npm run regenerate-detailed

# Show help
node regenerate-html.js --help
```

### Enhanced Detailed Reports

The `--detailed` flag forces regeneration of HTML reports with comprehensive violation details including:

- **🎯 Impact Level Badges**: Visual indicators for critical, serious, moderate, and minor violations
- **🔍 DOM Selectors**: Precise CSS selectors showing exactly which elements have issues
- **📝 HTML Snippets**: Actual markup of problematic elements for better context
- **📋 Failure Summaries**: Specific explanations of what's wrong and how to fix it
- **💡 Remediation Links**: Direct links to Deque University help pages with detailed guidance

### When to Use This Utility

- **Legacy Reports**: Convert old JSON-only reports to include HTML versions
- **Missing HTML**: When HTML generation failed during the original crawl
- **Enhanced Details**: Upgrade existing reports to the new detailed format with `--detailed`
- **Batch Processing**: Retroactively add HTML reports to all existing scans
- **Debugging**: Regenerate reports with updated HTML templates

The utility will:
- ✅ Scan all report directories automatically
- ✅ Only process JSON files that don't have corresponding HTML files
- ✅ Preserve all original data and metadata
- ✅ Generate properly formatted, styled HTML reports
- ✅ Update the web dashboard to display the new reports

## Troubleshooting

### Common Issues

**"Failed to launch browser"**
- Run `npm run install-browsers` to install Playwright browsers

**"Timeout" errors**
- Increase the delay (`-t` option) between requests
- Reduce concurrency (`-c` option)

**"HTTPS required" error**
- Ensure your seed URL starts with `https://`

**Large output files**
- Use smaller depth values for initial testing
- Consider filtering specific pages rather than full site crawls

### Performance Tuning

For large sites:
```bash
# Conservative approach
node crawler.js -s https://large-site.com -d 2 -c 2 -t 2000

# Balanced approach
node crawler.js -s https://medium-site.com -d 2 -c 4 -t 1000

# Aggressive approach (use with caution)
node crawler.js -s https://fast-site.com -d 3 -c 6 -t 500
```

## Mixed Mode: Sitemap + Discovery

By default, the crawler uses **mixed mode** which automatically:

1. **Tries to find sitemap.xml** at common locations:
   - `/sitemap.xml`
   - `/sitemap_index.xml` 
   - `/sitemaps.xml`

2. **If sitemap found**: Uses all URLs from sitemap (faster, more comprehensive)
3. **If no sitemap**: Falls back to discovery crawling using depth setting

### Sitemap Mode Benefits
- **Comprehensive**: Gets all pages the site wants crawled
- **Faster**: No need to discover links by crawling
- **Complete**: Often includes pages not linked from navigation

### Examples

**Default mixed mode:**
```bash
node crawler.js -s https://example.com
# 🗺️ Tries sitemap first, falls back to discovery
```

**Force discovery crawling only:**
```bash
node crawler.js -s https://example.com --no-sitemap
# 🔍 Skips sitemap, uses link discovery with depth limit
```

**Mixed mode with fallback settings:**
```bash
node crawler.js -s https://example.com -d 3 -c 2
# 🗺️ Tries sitemap first, if not found uses depth 3 discovery
```

## WCAG Testing Configuration

The crawler supports testing against different WCAG versions and compliance levels.

### WCAG Versions & Levels

**WCAG Version Options:**
- `2.0` - WCAG 2.0 (legacy)
- `2.1` - WCAG 2.1 (default, widely adopted standard)
- `2.2` - WCAG 2.2 (latest standard)

**Compliance Level Options:**
- `A` - Level A compliance only
- `AA` - Level A + AA compliance (default, recommended)
- `AAA` - Level A + AA + AAA compliance

### Examples

**WCAG 2.2 Level AA (latest standard):**
```bash
node crawler.js -s https://example.com --wcag-version 2.2 --wcag-level AA
```

**WCAG 2.1 Level AAA (comprehensive):**
```bash
node crawler.js -s https://example.com --wcag-version 2.1 --wcag-level AAA
```

**WCAG 2.0 Level A (basic compliance):**
```bash
node crawler.js -s https://example.com --wcag-version 2.0 --wcag-level A
```

**Custom axe tags (advanced):**
```bash
node crawler.js -s https://example.com --custom-tags "wcag2aa,best-practice,cat.color"
```

### What Gets Tested

- **WCAG 2.1 AA** (default): `wcag2a, wcag21a, wcag2aa, wcag21aa`
- **WCAG 2.0 AA**: `wcag2a, wcag2aa`
- **WCAG 2.2 AA**: `wcag2a, wcag21a, wcag22a, wcag2aa, wcag21aa, wcag22aa`
- **Custom tags**: Whatever you specify (see [axe-core docs](https://www.deque.com/axe/core-documentation/api-documentation/#axe-core-tags))

### Recommendations

- **For most projects**: Use `--wcag-version 2.1 --wcag-level AA` (widely adopted standard)
- **For cutting-edge compliance**: Use `--wcag-version 2.2 --wcag-level AA` (latest standard)
- **For government/enterprise**: Check your specific requirements (often WCAG 2.1 AA)
- **For comprehensive testing**: Use `--wcag-level AAA` (strictest requirements)

## Reports & Output

### Report Structure

The crawler automatically organizes reports in a structured directory:

```
reports/
├── example.com/
│   ├── example.com_wcag2.1_AA_2025-09-14T10-03-42.json
│   ├── example.com_wcag2.1_AA_2025-09-14T10-03-42.html
│   └── ...
├── another-site.org/
│   ├── another-site.org_wcag2.2_AAA_2025-09-14T11-30-15.json
│   └── ...
```

### Report Types

**JSON Reports** (always generated):
- Raw accessibility scan data from axe-core
- Complete test results for programmatic processing
- Contains violations, passes, incomplete, and inapplicable tests

**HTML Reports** (optional with `--html` flag):
- Beautiful, interactive web-based reports
- Summary statistics and violation overviews
- Grouped by issue type with affected pages
- Easy to share with stakeholders and clients

### Examples

**Generate both JSON and HTML reports:**
```bash
node crawler.js -s https://example.com --html
```

**Custom output filename (in domain directory):**
```bash
node crawler.js -s https://example.com -o my-custom-report.json --html
```

**Multiple scans organized by domain:**
```bash
# Scan multiple sites - automatically organized
node crawler.js -s https://site1.com --html
node crawler.js -s https://site2.com --html
node crawler.js -s https://site3.com --html
```

### Report Features

- **Automatic organization** by domain/hostname
- **Timestamped filenames** for tracking scan history
- **WCAG version/level** included in filename for easy identification
- **Professional HTML reports** with visual charts and statistics
- **Violation grouping** by issue type and impact level
- **Page-by-page breakdown** of accessibility issues

## Development

To modify or extend the crawler:

1. The main logic is in `crawler.js`
2. Key dependencies:
   - **playwright**: Browser automation
   - **axe-core**: Accessibility testing engine
   - **commander**: CLI interface
   - **p-limit**: Concurrency control

## License

MIT License - Feel free to modify and distribute as needed.