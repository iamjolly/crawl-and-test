# Serverless Examples - Updated for Current Project Structure

## ⚠️ Important Notes

These serverless examples have been updated to reflect the current project structure with:
- ✅ Modular architecture (`src/` directory organization)  
- ✅ Configuration system with dotenv support
- ✅ Updated template paths and asset locations
- ✅ Current WCAG version options (2.0, 2.1, 2.2)

## 🚧 Required Changes for Production Deployment

### 1. **Code Modularization Required**

The current `src/core/crawler.js` is a monolithic script. For serverless deployment, you'll need to:

```bash
# Extract core crawling logic into reusable modules:
src/core/
├── crawler.js           # Main CLI script (current)
├── crawler-engine.js    # ← Extract core crawling logic here
├── sitemap-parser.js    # ← Extract sitemap logic here  
├── page-analyzer.js     # ← Extract accessibility analysis here
└── report-builder.js    # ← Extract report building here
```

### 2. **Lambda Bundle Requirements**

Your Lambda deployment package must include:

```bash
# Required directories to bundle:
├── src/                 # Entire src directory
│   ├── core/           # Configuration and crawler modules
│   ├── templates/      # All HTML templates
│   ├── styles/         # All CSS files
│   └── scripts/        # All JavaScript files
├── node_modules/       # All dependencies including dotenv
└── lambda-*.js         # Your Lambda handlers
```

### 3. **Environment Variables**

Set these in your serverless environment or `.env` file:

```bash
# Required for Lambda
REPORTS_BUCKET=your-s3-bucket-name
BUILD_HOOK_URL=https://api.netlify.com/build_hooks/your-hook-id

# Optional - inherit from config system
CATS_WCAG_VERSION=2.1
CATS_WCAG_LEVEL=AA
CATS_MAX_PAGES=50
```

## 📁 File Status

| File | Status | Notes |
|------|--------|-------|
| `lambda-crawler.js` | ✅ Updated | Now uses config system, needs modularization |
| `lambda-report-generator.js` | ✅ Updated | References new template/asset paths |
| `eleventy-dashboard.njk` | ✅ Updated | Fixed WCAG version dropdown |
| `eleventy-reports.js` | ✅ Current | No changes needed |
| `serverless.yml` | ✅ Updated | Added config environment variables |

## 🛠️ Deployment Steps

1. **Modularize the crawler** (extract reusable functions)
2. **Test locally** with the modular structure
3. **Bundle src/ directory** with your Lambda deployment
4. **Set environment variables** in your serverless config
5. **Deploy** using `serverless deploy`

## 🔗 Integration Points

These examples integrate with:
- **S3**: For report storage and static asset serving
- **Lambda**: For crawling and report generation
- **Eleventy/Static Sites**: For dashboard generation
- **Build Hooks**: For triggering static site rebuilds

The examples now properly reflect the current modular project structure and configuration system!