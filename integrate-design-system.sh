#!/bin/bash

# Design System Integration Script
# This script helps integrate the new design system into existing applications

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DESIGN_SYSTEM_PATH="src/styles/design-system"
BACKUP_DIR="backup_styles_$(date +%Y%m%d_%H%M%S)"
TEMP_DIR="temp_migration"

echo -e "${BLUE}🎨 A11y Crawl & Test Design System Integration${NC}"
echo "=================================================="
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if design system exists
if [ ! -d "$DESIGN_SYSTEM_PATH" ]; then
    print_error "Design system not found at $DESIGN_SYSTEM_PATH"
    exit 1
fi

print_status "Design system found at $DESIGN_SYSTEM_PATH"

# Create backup of existing styles
echo ""
echo "Creating backup of existing styles..."
if [ -d "src/styles" ]; then
    mkdir -p "$BACKUP_DIR"
    cp -r src/styles/* "$BACKUP_DIR/" 2>/dev/null || true
    print_status "Backup created at $BACKUP_DIR"
else
    print_info "No existing styles directory found"
fi

# Check for conflicting files
echo ""
echo "Checking for conflicting files..."
conflicts=0

if [ -f "src/styles/main.scss" ]; then
    print_warning "Found existing main.scss - will need manual review"
    conflicts=$((conflicts + 1))
fi

if [ -f "src/styles/variables.scss" ]; then
    print_warning "Found existing variables.scss - will need migration"
    conflicts=$((conflicts + 1))
fi

if [ -f "src/styles/components.scss" ]; then
    print_warning "Found existing components.scss - will need migration"
    conflicts=$((conflicts + 1))
fi

if [ $conflicts -eq 0 ]; then
    print_status "No conflicting files found"
else
    print_warning "$conflicts potential conflicts detected"
fi

# Validate design system structure
echo ""
echo "Validating design system structure..."

required_files=(
    "$DESIGN_SYSTEM_PATH/_index.scss"
    "$DESIGN_SYSTEM_PATH/tokens/_index.scss"
    "$DESIGN_SYSTEM_PATH/foundation/_index.scss"
    "$DESIGN_SYSTEM_PATH/components/atoms/_button.scss"
    "$DESIGN_SYSTEM_PATH/components/molecules/_card.scss"
    "$DESIGN_SYSTEM_PATH/layouts/_layout.scss"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Missing required file: $file"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -eq 0 ]; then
    print_status "All required design system files present"
else
    print_error "$missing_files required files missing"
    exit 1
fi

# Test SASS compilation
echo ""
echo "Testing SASS compilation..."
if command -v sass &> /dev/null; then
    mkdir -p "$TEMP_DIR"
    
    # Create test file
    cat > "$TEMP_DIR/test.scss" << 'EOF'
@use "../src/styles/design-system" as ds;

.test {
  color: ds.$color-primary;
  padding: ds.$space-4;
}
EOF
    
    if sass "$TEMP_DIR/test.scss" "$TEMP_DIR/test.css" &> /dev/null; then
        print_status "SASS compilation successful"
    else
        print_error "SASS compilation failed"
        print_info "Run: sass $TEMP_DIR/test.scss $TEMP_DIR/test.css for details"
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
else
    print_warning "SASS compiler not found - skipping compilation test"
    print_info "Install SASS: npm install -g sass"
fi

# Check for Node.js project
echo ""
echo "Checking project environment..."
if [ -f "package.json" ]; then
    print_status "Node.js project detected"
    
    # Check for SASS in dependencies
    if grep -q "sass\|node-sass\|dart-sass" package.json; then
        print_status "SASS dependency found"
    else
        print_warning "No SASS dependency found"
        print_info "Add SASS: npm install --save-dev sass"
    fi
    
    # Check for build scripts
    if grep -q "build\|compile" package.json; then
        print_status "Build scripts found"
    else
        print_warning "No build scripts found"
        print_info "Consider adding build scripts to package.json"
    fi
else
    print_info "Not a Node.js project - manual SASS setup required"
fi

# Generate integration examples
echo ""
echo "Generating integration examples..."

# Create main integration file
cat > "integration-example.scss" << 'EOF'
// Example: How to integrate the design system into your application

// 1. Import the complete design system
@use "src/styles/design-system" as ds;

// 2. Or import specific modules
// @use "src/styles/design-system/tokens" as tokens;
// @use "src/styles/design-system/components/atoms" as atoms;

// 3. Use design system in your components
.my-app {
  // Use design tokens
  background: ds.$color-background-primary;
  color: ds.$color-text-primary;
  font-family: ds.$font-family-primary;
  
  // Use spacing system
  padding: ds.$space-6;
  gap: ds.$space-4;
  
  // Extend design system components
  .my-button {
    @extend .btn;
    @extend .btn-primary;
    
    // Custom overrides
    border-radius: ds.$radius-lg;
  }
  
  .my-card {
    @extend .card;
    
    // Add custom styles
    box-shadow: ds.$shadow-lg;
  }
}

// 4. Create custom components using design system
.custom-alert {
  background: ds.$color-warning-light;
  border: 1px solid ds.$color-warning;
  border-radius: ds.$radius-md;
  padding: ds.$space-4;
  color: ds.$color-warning-dark;
  
  .alert-title {
    font-weight: ds.$font-weight-semibold;
    margin-bottom: ds.$space-2;
  }
}

// 5. Use responsive utilities
.responsive-layout {
  display: grid;
  gap: ds.$space-4;
  
  // Mobile first
  grid-template-columns: 1fr;
  
  // Tablet and up
  @include ds.media-md {
    grid-template-columns: 1fr 300px;
  }
  
  // Desktop and up
  @include ds.media-lg {
    grid-template-columns: 1fr 400px;
  }
}
EOF

print_status "Created integration-example.scss"

# Create HTML integration example
cat > "integration-example.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design System Integration Example</title>
  <!-- Include compiled CSS -->
  <link rel="stylesheet" href="path/to/compiled/styles.css">
</head>
<body>
  <!-- Use design system classes directly -->
  <div class="container">
    <header class="page-header">
      <h1>My Application</h1>
      <p class="text-secondary">Using the design system</p>
    </header>
    
    <main class="page-main">
      <!-- Cards using design system -->
      <div class="grid grid-cols-1 grid-md-2 gap-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Feature 1</h3>
          </div>
          <div class="card-body">
            <p class="card-text">Description of feature 1</p>
          </div>
          <div class="card-footer">
            <div class="card-actions">
              <button class="btn btn-primary">Learn More</button>
            </div>
          </div>
        </div>
        
        <div class="card card-success">
          <div class="card-header">
            <h3 class="card-title">Success Story</h3>
          </div>
          <div class="card-body">
            <p class="card-text">Something went well!</p>
          </div>
        </div>
      </div>
      
      <!-- Form using design system -->
      <form class="form">
        <div class="form-section">
          <h3 class="form-section-title">Contact Information</h3>
          
          <div class="form-group">
            <label class="form-label required" for="name">Name</label>
            <input type="text" class="form-control" id="name" required>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input type="email" class="form-control" id="email">
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Submit</button>
          <button type="button" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
    </main>
  </div>
</body>
</html>
EOF

print_status "Created integration-example.html"

# Create package.json scripts example
cat > "package-scripts-example.json" << 'EOF'
{
  "scripts": {
    "build:css": "sass src/styles/main.scss dist/css/main.css --style=compressed",
    "watch:css": "sass src/styles/main.scss dist/css/main.css --watch",
    "build:css:dev": "sass src/styles/main.scss dist/css/main.css --source-map",
    "lint:css": "stylelint 'src/styles/**/*.scss'",
    "test:css": "sass src/styles/main.scss /tmp/test.css && rm /tmp/test.css"
  },
  "devDependencies": {
    "sass": "^1.69.0",
    "stylelint": "^15.11.0",
    "stylelint-config-standard-scss": "^11.1.0"
  }
}
EOF

print_status "Created package-scripts-example.json"

# Performance recommendations
echo ""
echo "Performance Recommendations:"
echo "=============================="
print_info "1. Use CSS custom properties for runtime theming"
print_info "2. Import only the components you need"
print_info "3. Enable CSS purging for production builds"
print_info "4. Use the contain property for performance"
print_info "5. Consider critical CSS extraction"

# Security recommendations
echo ""
echo "Security Recommendations:"
echo "=========================="
print_info "1. Sanitize user input in form components"
print_info "2. Use CSP headers with style-src directives"
print_info "3. Validate any dynamic CSS custom property values"
print_info "4. Keep SASS dependencies updated"

# Accessibility notes
echo ""
echo "Accessibility Features:"
echo "======================"
print_info "1. WCAG 2.1 AA compliant color combinations"
print_info "2. Focus indicators on all interactive elements"
print_info "3. Screen reader accessible markup"
print_info "4. Keyboard navigation support"
print_info "5. Responsive design for mobile accessibility"

# Migration checklist
echo ""
echo "Migration Checklist:"
echo "==================="
print_info "□ Backup existing styles"
print_info "□ Install SASS compiler"
print_info "□ Import design system"
print_info "□ Update HTML classes to use design system"
print_info "□ Test responsive breakpoints"
print_info "□ Validate accessibility features"
print_info "□ Test keyboard navigation"
print_info "□ Verify color contrast ratios"
print_info "□ Update build scripts"
print_info "□ Document custom components"

echo ""
print_status "Integration setup complete!"
print_info "Review the generated example files:"
print_info "  - integration-example.scss"
print_info "  - integration-example.html"
print_info "  - package-scripts-example.json"

echo ""
print_info "Next steps:"
print_info "  1. Review and adapt the integration examples"
print_info "  2. Update your build process to compile SASS"
print_info "  3. Test the design system with your content"
print_info "  4. Gradually migrate existing components"
print_info "  5. Use the testing suite to validate changes"

echo ""
print_info "For testing, open: $DESIGN_SYSTEM_PATH/testing/index.html"
print_info "For documentation, see: $DESIGN_SYSTEM_PATH/README.md"

echo ""
echo -e "${GREEN}🎉 Design system integration ready!${NC}"