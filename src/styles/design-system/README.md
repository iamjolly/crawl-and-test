# A11y Crawl & Test Design System

> A comprehensive, accessible, and modern design system built with SASS and CSS
> custom properties.

## 🎯 Overview

This design system provides a complete set of design tokens, components, and
layouts for building accessible web applications. It follows atomic design
principles and uses modern CSS custom properties for runtime theming.

### ✨ Key Features

- **Accessibility-First**: WCAG 2.1 AA compliant colors and patterns
- **Modern Architecture**: CSS custom properties with SASS compatibility
- **Atomic Design**: Scalable component architecture
- **Runtime Theming**: Dynamic theming through CSS custom properties
- **Tree-shakable**: Import only what you need
- **Responsive**: Mobile-first responsive design system

## 📦 Installation & Usage

### Basic Import

```scss
// Import the complete design system
@use 'styles/design-system' as ds;

.my-component {
  background: ds.$color-primary;
  padding: ds.$space-4;
  border-radius: ds.$radius-md;
}
```

### Selective Imports

```scss
// Import only tokens
@use 'styles/design-system/tokens' as tokens;

// Import only components
@use 'styles/design-system/components/atoms' as atoms;
```

## 🎨 Design Tokens

### Colors

Our color system provides semantic color tokens that map to accessible color
values.

```scss
// Primary colors
--color-primary: #004085;
--color-primary-hover: #0056b3;
--color-primary-focus: #0056b3;

// Status colors
--color-success: #208636;
--color-warning: #ffc107;
--color-danger: #dc3545;
--color-info: #118294;

// Text colors
--color-text-primary: #212529;
--color-text-secondary: #495057;
--color-text-muted: #6c757d;
```

### Typography

```scss
// Font families
--font-family-primary:
  system-ui, -apple-system, 'Segoe UI', 'Roboto', sans-serif;
--font-family-code: ui-monospace, 'Menlo', 'Monaco', monospace;

// Font sizes (semantic)
--text-heading-1: 1.875rem; // 30px
--text-heading-2: 1.5rem; // 24px
--text-body-medium: 1rem; // 16px
--text-body-small: 0.875rem; // 14px

// Font weights
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Spacing

Uses a 4px grid system for consistent spacing.

```scss
// Base spacing scale
--space-1: 0.25rem; // 4px
--space-2: 0.5rem; // 8px
--space-3: 0.75rem; // 12px
--space-4: 1rem; // 16px
--space-6: 1.5rem; // 24px
--space-8: 2rem; // 32px

// Semantic spacing
--space-component-sm: var(--space-2);
--space-component-md: var(--space-4);
--space-component-lg: var(--space-6);
```

### Breakpoints

```scss
--breakpoint-sm: 576px;
--breakpoint-md: 768px;
--breakpoint-lg: 992px;
--breakpoint-xl: 1200px;
--breakpoint-xxl: 1400px;
```

## 🧩 Components

### Atoms

#### Buttons

```html
<!-- Primary button -->
<button class="btn btn-primary">Primary Action</button>

<!-- Secondary button -->
<button class="btn btn-secondary">Secondary Action</button>

<!-- Button sizes -->
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Default</button>
<button class="btn btn-primary btn-lg">Large</button>

<!-- Button states -->
<button class="btn btn-primary" disabled>Disabled</button>
<button class="btn btn-primary btn-loading">Loading</button>
```

**SCSS Usage:**

```scss
.custom-button {
  @extend .btn;
  @extend .btn-primary;

  // Custom overrides
  border-radius: var(--radius-lg);
}
```

#### Inputs

```html
<!-- Text input -->
<div class="form-group">
  <label class="form-label" for="email">Email</label>
  <input
    type="email"
    class="form-control"
    id="email"
    placeholder="Enter email"
  />
  <div class="form-text">We'll never share your email.</div>
</div>

<!-- Input sizes -->
<input type="text" class="form-control form-control-sm" placeholder="Small" />
<input type="text" class="form-control" placeholder="Default" />
<input type="text" class="form-control form-control-lg" placeholder="Large" />

<!-- Input states -->
<input type="text" class="form-control is-valid" placeholder="Valid" />
<input type="text" class="form-control is-invalid" placeholder="Invalid" />
```

#### Links

```html
<!-- Basic link -->
<a href="#" class="link">Default Link</a>

<!-- Link variants -->
<a href="#" class="link link-primary">Primary Link</a>
<a href="#" class="link link-muted">Muted Link</a>
<a href="#" class="link link-no-underline">No Underline</a>

<!-- Button-style link -->
<a href="#" class="link-button link-button-primary">Button Link</a>
```

### Molecules

#### Cards

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <p class="card-subtitle">Card subtitle</p>
  </div>
  <div class="card-body">
    <p class="card-text">Card content goes here.</p>
  </div>
  <div class="card-footer">
    <div class="card-actions">
      <button class="btn btn-primary">Action</button>
      <button class="btn btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```

**Card Variants:**

```html
<!-- Colored cards -->
<div class="card card-primary">...</div>
<div class="card card-success">...</div>
<div class="card card-warning">...</div>

<!-- Card sizes -->
<div class="card card-sm">...</div>
<div class="card card-lg">...</div>

<!-- Interactive card -->
<div class="card card-interactive">...</div>
```

#### Forms

```html
<form class="form">
  <div class="form-section">
    <h3 class="form-section-title">User Information</h3>

    <div class="form-group">
      <label class="form-label required" for="name">Full Name</label>
      <input type="text" class="form-control" id="name" required />
    </div>

    <div class="form-group">
      <label class="form-label" for="bio">Bio</label>
      <textarea class="form-control" id="bio" rows="3"></textarea>
    </div>
  </div>

  <div class="form-actions">
    <button type="submit" class="btn btn-primary">Save</button>
    <button type="button" class="btn btn-secondary">Cancel</button>
  </div>
</form>
```

#### Accordions

```html
<div class="accordion">
  <div class="accordion-item">
    <h3 class="accordion-header">
      <button class="accordion-trigger" aria-expanded="false">
        <span class="accordion-title">Section 1</span>
        <span class="accordion-icon">↓</span>
      </button>
    </h3>
    <div class="accordion-content">
      <p>Content for section 1.</p>
    </div>
  </div>
</div>
```

**Report-specific accordion:**

```html
<div class="report-accordion">
  <div class="report-accordion-item impact-critical">
    <h3 class="accordion-header">
      <button class="report-accordion-trigger">
        <span class="impact-badge">Critical</span>
        <div class="violation-info">
          <span class="violation-title">Missing alt text</span>
          <span class="violation-description">Images must have alt text</span>
        </div>
        <span class="accordion-icon">↓</span>
      </button>
    </h3>
    <div class="report-accordion-content">
      <!-- Violation details -->
    </div>
  </div>
</div>
```

## 🏗️ Layout System

### Containers

```html
<!-- Fixed-width container -->
<div class="container">
  <!-- Content -->
</div>

<!-- Full-width container -->
<div class="container-fluid">
  <!-- Content -->
</div>

<!-- Narrow container -->
<div class="container-narrow">
  <!-- Content -->
</div>
```

### Grid System

```html
<!-- CSS Grid -->
<div class="grid grid-cols-3 gap-4">
  <div class="grid-item">Item 1</div>
  <div class="grid-item col-span-2">Item 2 (spans 2 columns)</div>
</div>

<!-- Responsive grid -->
<div class="grid grid-cols-1 grid-md-2 grid-lg-3">
  <div class="grid-item">Responsive item</div>
</div>
```

### Flexbox

```html
<div class="flex justify-between items-center gap-4">
  <div class="flex-item">Left content</div>
  <div class="flex-item">Right content</div>
</div>
```

### Page Layouts

```html
<!-- Basic page layout -->
<div class="page">
  <header class="page-header">Header content</header>
  <main class="page-main">Main content</main>
  <footer class="page-footer">Footer content</footer>
</div>

<!-- Two-column layout -->
<div class="layout-two-column">
  <main class="main-content">Main content</main>
  <aside class="side-content">Sidebar content</aside>
</div>

<!-- Report layout -->
<div class="report-layout">
  <main class="report-main">Report content</main>
  <aside class="report-sidebar">Report metadata</aside>
</div>
```

## ♿ Accessibility

### Focus Management

The design system provides consistent focus indicators:

```scss
// Automatic focus styling
.btn:focus-visible {
  outline: 2px solid var(--color-primary-focus);
  outline-offset: 2px;
}

// Custom focus utility
.focus-visible:focus-visible {
  outline: 2px solid var(--color-primary-focus);
  outline-offset: 2px;
}
```

### Color Contrast

All color combinations meet WCAG 2.1 AA standards:

- Text on background: 4.5:1 minimum
- Interactive elements: 3:1 minimum
- Focus indicators: Clear visual distinction

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Tab order follows logical reading order
- Skip links provided for screen readers

### Screen Reader Support

```html
<!-- Screen reader only text -->
<span class="sr-only">Additional context for screen readers</span>

<!-- Accessible form labels -->
<label for="search" class="form-label">
  Search
  <span class="sr-only">(Press Enter to search)</span>
</label>
```

## 📱 Responsive Design

### Breakpoint Usage

```scss
// Using mixins
@include media-md {
  .component {
    grid-template-columns: repeat(2, 1fr);
  }
}

// Using utility classes
<div class="grid grid-cols-1 grid-md-2 grid-lg-3">
```

### Mobile-First Approach

All components are designed mobile-first and enhanced for larger screens.

## 🎨 Customization

### Runtime Theming

Change themes by updating CSS custom properties:

```css
:root {
  --color-primary: #007bff;
  --color-primary-hover: #0056b3;
}

/* Dark theme */
.theme-dark {
  --color-background-primary: #1a1a1a;
  --color-text-primary: #ffffff;
}
```

### Component Customization

```scss
// Extend existing components
.custom-card {
  @extend .card;

  border: 2px solid var(--color-primary);

  .card-header {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }
}

// Override specific properties
.btn-custom {
  @extend .btn;

  background: linear-gradient(
    45deg,
    var(--color-primary),
    var(--color-success)
  );
  border: none;

  &:hover {
    background: linear-gradient(
      45deg,
      var(--color-primary-hover),
      var(--color-success-hover)
    );
  }
}
```

## 🔧 Build Integration

### SASS Configuration

```scss
// Configure design system features
$enable-responsive-utilities: true;
$enable-print-styles: true;
$enable-animations: true;
$debug-mode: false; // Set to true for development

@use 'design-system' as ds with (
  $enable-responsive-utilities: true,
  $debug-mode: false
);
```

### Performance Optimization

```scss
// Import only what you need
@use 'design-system/tokens' as tokens;
@use 'design-system/components/atoms' as atoms;

// Tree-shake unused components
@use 'design-system' as ds with (
  $include-molecules: false,
  $include-layouts: false
);
```

## 🚀 Migration Guide

### From Old SASS Architecture

1. **Replace imports:**

   ```scss
   // Old
   @import 'abstracts/variables';
   @import 'components/buttons';

   // New
   @use 'design-system' as ds;
   ```

2. **Update variable references:**

   ```scss
   // Old
   color: $primary-color;
   padding: $spacer;

   // New
   color: var(--color-primary);
   padding: var(--space-4);
   ```

3. **Use semantic classes:**

   ```html
   <!-- Old -->
   <button class="btn-primary">Button</button>

   <!-- New -->
   <button class="btn btn-primary">Button</button>
   ```

### Gradual Migration Strategy

1. Import new design system alongside existing styles
2. Convert components one by one
3. Remove old styles when all components are converted
4. Clean up unused imports and variables

## 📚 Examples

### Complete Form Example

```html
<form class="form form-card">
  <div class="form-section">
    <h2 class="form-section-title">Contact Information</h2>
    <p class="form-section-description">Please provide your contact details.</p>

    <div class="form-group">
      <label class="form-label required" for="email">Email Address</label>
      <input type="email" class="form-control" id="email" required />
      <div class="form-text">We'll use this to send you updates.</div>
    </div>

    <div class="form-group">
      <label class="form-label" for="phone">Phone Number</label>
      <input type="tel" class="form-control" id="phone" />
    </div>
  </div>

  <div class="form-actions form-actions-end">
    <button type="button" class="btn btn-secondary">Cancel</button>
    <button type="submit" class="btn btn-primary">Submit</button>
  </div>
</form>
```

### Dashboard Layout Example

```html
<div class="page">
  <header class="page-header">
    <div class="container">
      <h1>Accessibility Dashboard</h1>
    </div>
  </header>

  <main class="page-main">
    <div class="container">
      <div class="dashboard-layout">
        <div class="dashboard-header">
          <h2 class="dashboard-title">Recent Reports</h2>
          <p class="dashboard-description">
            Monitor your website's accessibility compliance.
          </p>
        </div>

        <div class="dashboard-item">
          <div class="card">
            <div class="card-body">
              <h3 class="card-title">example.com</h3>
              <p class="card-text">Last scanned: 2 hours ago</p>
            </div>
            <div class="card-footer">
              <div class="card-actions">
                <a href="#" class="btn btn-primary">View Report</a>
                <a href="#" class="btn btn-secondary">Download</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>
```

## 🐛 Troubleshooting

### Common Issues

1. **Missing custom properties**
   - Ensure design system is imported before other styles
   - Check that `:root` styles are applied

2. **Component styles not working**
   - Verify correct class names
   - Check that component modules are imported

3. **SASS compilation errors**
   - Use `@use` instead of `@import`
   - Check file paths are correct

### Browser Support

- Modern browsers (Chrome 88+, Firefox 85+, Safari 14+, Edge 88+)
- CSS custom properties required
- Grid and Flexbox support required

## 📈 Performance

### Bundle Size

- Core tokens: ~2KB gzipped
- Complete system: ~15KB gzipped
- Tree-shakable components

### Critical CSS

Inline critical styles for above-the-fold content:

```scss
@use 'design-system/critical' as critical;
```

### Loading Strategy

1. Inline critical CSS in `<head>`
2. Load design system asynchronously
3. Progressive enhancement for complex components

---

## 📄 License

This design system is part of the A11y Crawl & Test project and follows the same
licensing terms.

## 🤝 Contributing

When contributing to the design system:

1. Follow accessibility guidelines
2. Test with screen readers
3. Verify keyboard navigation
4. Check color contrast ratios
5. Document all changes

---

Built with ❤️ for accessible web experiences
