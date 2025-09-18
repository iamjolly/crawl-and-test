# Visual Reference - Main Branch Original Styling

## Dashboard Page (/public/index.html)

### Header Section
- **Background**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **H1 Styling**: 
  - `color: white` ⭐ KEY FIX NEEDED
  - `font-size: 2.5rem`
  - `font-weight: 700`
  - `margin-bottom: 0.5rem`
- **Header paragraph**: `opacity: 0.9`, `font-size: 1.1rem`
- **Padding**: `2rem` all around
- **Border radius**: `10px`
- **Margin bottom**: `2rem`

### Body/Container
- **Font family**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Background**: `#f5f5f5`
- **Container max-width**: `1200px`
- **Container padding**: `20px`

### Buttons
- **Border radius**: `4px` ⭐ KEY: Not 6px or 8px
- **Padding**: `8px 16px`
- **Font weight**: `500`
- **Transition**: `all 0.2s ease`

### Grid/Reports
- **Grid gap**: Should be `2rem` (32px) between report cards
- **Report item background**: `#f8f9fa`
- **Report item padding**: `1.5rem`
- **Report item border-radius**: `8px`
- **Report item margin-bottom**: `1rem`
- **Report item border-left**: `4px solid #667eea`

## Report Pages 

### Base Styling
- **Font family**: `Arial, sans-serif` ⭐ NOTE: Different from dashboard!
- **Body margin**: `20px`
- **Body background**: `#f5f5f5`
- **Container background**: `white`
- **Container padding**: `20px`
- **Container border-radius**: `8px`
- **Container box-shadow**: `0 2px 4px rgba(0,0,0,0.1)`

### Header
- **H1 color**: `#333` (not white like dashboard)
- **Border bottom**: `2px solid #e0e0e0`
- **Padding bottom**: `20px`
- **Margin bottom**: `20px`

### Download Button
- **Background**: `#007bff`
- **Border**: `2px solid #007bff`
- **Padding**: `8px 16px`
- **Border radius**: `4px`
- **Font size**: `14px`
- **Font weight**: `500`

### Summary Cards
- **Background**: `rgba(0, 123, 255, 0.1)`
- **Padding**: `15px`
- **Border radius**: `6px`
- **Border left**: `4px solid #007bff`
- **Grid gap**: `20px`

### Accordion Controls (page-details-header)
- **Position**: Right-aligned in header
- **Buttons**:
  - Expand All: `background: #1e7e34`, hover: `#155724`
  - Collapse All: `background: #545b62`, hover: `#3d4349`
  - Padding: `6px 12px`
  - Border radius: `4px`
  - Font size: `12px`
  - Font weight: `500`
  - Gap between buttons: `5px`

### Accordion Headers
- **Background**: `#f8f9fa`
- **Padding**: `15px`
- **Border bottom**: `1px solid #e0e0e0`
- **Hover**: `#e9ecef`

### Issues
- **Background**: `#f8f9fa`
- **Border left**: `4px solid #dc3545` (red for violations)
- **Padding**: `10px 15px`
- **Margin bottom**: `10px`
- **Border radius**: `0 4px 4px 0`
- **NO full border** - only left border

### Issue HTML/Code blocks
- **Background**: `#f8f9fa`
- **Border**: `1px solid #dee2e6`
- **Padding**: `8px`
- **Border radius**: `3px`
- **Font family**: `monospace`
- **Font size**: `12px`
- **Margin**: `8px 0`

### Issue Failure blocks
- **Background**: `#fff3cd`
- **Border**: `1px solid #ffeaa7`
- **Padding**: `8px`
- **Border radius**: `3px`
- **Font size**: `13px`
- **Margin**: `8px 0`

### Impact Badges
- **Padding**: `2px 6px`
- **Border radius**: `3px`
- **Font size**: `11px`
- **Font weight**: `bold`
- **Margin bottom**: `8px`
- **Colors**:
  - Critical: `background: #ffebee`, `color: #000`
  - Serious: `background: #fff3e0`, `color: #000`
  - Moderate: `background: #fff8e1`, `color: #000`
  - Minor: `background: #e3f2fd`, `color: #000`

### Page List
- **Padding**: `5px 0` for list items
- **Margin**: `10px 0` for list
- **Border bottom**: `1px solid #f0f0f0`

### Affected Pages Summary
- **Font weight**: `500`
- **Color**: `#004085`
- **Margin bottom**: `10px`

## Key Differences Found vs SASS
1. ⭐ **Dashboard H1**: Should be white, not dark
2. ⭐ **Font families**: Dashboard uses system fonts, Reports use Arial
3. ⭐ **Spacing**: Many exact pixel values vs SASS variables
4. ⭐ **Border radius**: Consistently 4px for buttons, not variable sizes
5. ⭐ **Grid gaps**: 32px (2rem) not 16px
6. ⭐ **Issue styling**: Only left border, specific background colors
7. ⭐ **Accordion controls**: Specific button colors and positioning