# Data Directory

This directory contains reference data files used by the accessibility testing
application.

## Files

### wcag.json

- **Source**: [tenon-io/wcag-as-json](https://github.com/tenon-io/wcag-as-json)
- **Version**: WCAG 2.2
- **Purpose**: Maps WCAG Success Criteria to W3C documentation links
- **Usage**: Used by `WcagLinkMapper` to provide "How to Meet" and
  "Understanding" links in accessibility reports
- **Structure**: JSON array containing WCAG principles, guidelines, and success
  criteria with reference URLs
- **Configuration**: Path configurable via `CATS_WCAG_DATA_FILE` environment
  variable (defaults to `data/wcag.json`)

## Configuration

The data directory and files are configurable through environment variables:

- `CATS_DATA_DIR`: Base data directory (default: `data/`)
- `CATS_WCAG_DATA_FILE`: WCAG JSON data file path (default: `data/wcag.json`)

## Updating Data Files

### WCAG Data

To update the WCAG data to a newer version:

```bash
# Download latest wcag.json from tenon-io/wcag-as-json
curl -s "https://api.github.com/repos/tenon-io/wcag-as-json/contents/wcag.json" | jq -r '.download_url' | xargs curl -s -o data/wcag.json
```

## Future Data Files

This directory can be extended to include:

- Different WCAG versions (2.0, 2.1, 2.2)
- Section 508 compliance mappings
- EN 301 549 standard references
- Custom accessibility rule definitions
- Industry-specific accessibility guidelines
