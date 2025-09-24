# Development Tools

This directory contains development tools and utilities for the CATS project.

## Design System Tools (`/design-system/`)

Tools for developing and maintaining the design system:

### **`design-system-showcase.html`**

- **Purpose**: Standalone design system documentation and component showcase
- **Usage**: Compiled into `dist/design-system/` for hosting
- **View**: Can be opened directly in browser or served via build scripts

### **`design-system-package.json`**

- **Purpose**: Alternative package.json with design system-specific build
  scripts
- **Usage**: Contains scripts for building, watching, and testing design system
  components
- **Note**: Separate from main package.json for modular development

### **`integrate-design-system.sh`**

- **Purpose**: Migration script for integrating design system into existing
  projects
- **Usage**: One-time utility for migrating from legacy CSS to design system
- **Status**: Legacy tool - may not be needed for current development

### **`examples/`**

- **`integration-example.html`** - HTML example showing design system class
  usage
- **`integration-example.scss`** - SCSS example showing design system
  integration patterns
- **`package-scripts-example.json`** - Example package.json scripts for design
  system builds
- **Purpose**: Reference templates for developers integrating the design system

## Usage

To work with design system tools:

```bash
# Build design system documentation
node scripts/build-design-system-docs.js

# View showcase (after moving to tools/)
open tools/design-system/design-system-showcase.html

# Run design system specific scripts
# (would require updating package paths in design-system-package.json)
```

## Note

These tools are kept separate from the main application to maintain a clear
distinction between:

- **Main application** (CATS accessibility crawler and dashboard)
- **Design system tooling** (development and documentation utilities)
