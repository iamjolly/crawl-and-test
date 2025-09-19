# Development & Build Scripts

This document contains all build, development, and configuration scripts for CATS.

## Build & Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development workflow: watch SASS + serve dashboard (port 3000) |
| `npm run serve` | Start dashboard server only (port 3000) |
| `npm run serve:reports` | Alternative alias for dashboard server (compatibility) |
| `npm run serve:dashboard` | Alternative alias for dashboard server (compatibility) |
| `npm run build` | Complete build: compile SASS + generate HTML reports |
| `npm run build:prod` | Production build: compile SASS + optimize CSS + generate HTML |
| `npm run build:domain` | Generate reports for specific domain |
| `npm run sass:build` | Compile all SASS files (design system + legacy + report styles) |
| `npm run sass:watch` | Watch and compile SASS files during development |
| `npm run css:optimize` | Optimize all CSS files using PostCSS/cssnano |
| `npm run html:build` | Generate HTML reports from existing JSON data |
| `npm run clean` | Remove all generated reports and CSS files |
| `npm run install-browsers` | Install Playwright browsers |

### SASS Build Scripts

| Command | Description |
|---------|-------------|
| `npm run sass:design-system` | Compile design system SASS to compressed CSS |
| `npm run sass:legacy-compat` | Compile legacy compatibility styles |
| `npm run sass:report` | Compile report-specific styles |
| `npm run sass:design-system:watch` | Watch design system SASS files |
| `npm run sass:legacy-compat:watch` | Watch legacy compatibility SASS files |
| `npm run sass:report:watch` | Watch report SASS files |

### CSS Optimization Scripts

| Command | Description |
|---------|-------------|
| `npm run css:optimize:design-system` | Optimize design system CSS with PostCSS |
| `npm run css:optimize:report` | Optimize report CSS with PostCSS |
| `npm run css:optimize:legacy` | Optimize legacy CSS with PostCSS |

## Environment Variables

See `.env.example` for all supported variables. Most common:

- `CATS_SERVER_PORT`: Dashboard server port (default: 3000)
- `CATS_PUBLIC_DIR`: Output directory for reports (default: public/)
- `CATS_REPORTS_DIR`: Reports storage location (default: public/reports/)
- `CATS_MAX_PAGES`: Maximum pages to crawl (default: 25)
- `CATS_WCAG_VERSION`: WCAG version (default: 2.1)
- `CATS_WCAG_LEVEL`: WCAG level (default: AA)
