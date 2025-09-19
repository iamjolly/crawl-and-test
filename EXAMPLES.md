# CLI & Usage Examples

This document contains comprehensive command line and dashboard usage examples for CATS.

## Command Line Examples

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
