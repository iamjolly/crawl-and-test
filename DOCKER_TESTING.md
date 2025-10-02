# Docker Testing Guide - Storage Persistence Improvements

This guide walks you through testing the enhanced storage functionality locally
via Docker to ensure no regressions and validate all new features work
correctly.

## 🎯 Testing Objectives

1. **Verify backward compatibility** - Existing functionality works unchanged
2. **Test enhanced storage features** - New persistence improvements function
   correctly
3. **Validate Docker environment** - All features work within containerized
   environment
4. **Test both storage modes** - Local storage and cloud storage emulation
5. **Ensure no regressions** - All original features continue to work

## 🚀 Pre-Testing Setup

### 1. Clean Environment

```bash
# Ensure clean Docker environment
docker-compose down -v
docker system prune -f

# Clean local reports (backup first if needed)
# cp -r public/reports public/reports.backup  # Optional backup
# rm -rf public/reports/*
```

### 2. Verify Current State

```bash
# Check current branch
git status
git log --oneline -3

# Verify no uncommitted changes
git diff --stat
```

## 📋 Testing Phases

## Phase 1: Basic Docker Build and Startup

### 1.1 Build Container

```bash
# Build the Docker image
docker-compose build

# Verify build completed successfully
docker images | grep cats-accessibility-crawler
```

**Expected Result:** ✅ Image builds without errors

### 1.2 Start Application

```bash
# Start application in detached mode
docker-compose up -d

# Check logs for any errors
docker-compose logs -f cats-app

# Wait for health check to pass
docker-compose ps
```

**Expected Results:**

- ✅ Container starts successfully
- ✅ Health check passes (healthy status)
- ✅ No error messages in logs
- ✅ Application accessible at http://localhost:3000

### 1.3 Basic Functionality Test

```bash
# Test web interface
curl -f http://localhost:3000/

# Check if dashboard loads
curl -s http://localhost:3000/ | grep -q "CATS" && echo "✅ Dashboard loads" || echo "❌ Dashboard failed"
```

## Phase 2: Storage Health and Enhanced Features

### 2.1 Test Enhanced Storage CLI (Inside Container)

```bash
# Enter the container
docker-compose exec cats-app bash

# Test storage health
npm run storage:health
# Expected: ✅ Storage is healthy

# Test storage connectivity
npm run storage health test
# Expected: ✅ Local storage test passed

# Test enhanced storage functionality
npm run storage:test
# Expected: 🎉 All tests passed!

# Exit container
exit
```

### 2.2 Verify New CLI Commands Work

```bash
# Test from host (should work via docker-compose exec)
docker-compose exec cats-app npm run storage:health

# Test integrity checking
docker-compose exec cats-app npm run storage:integrity

# Test migration utilities (dry run)
docker-compose exec cats-app npm run storage:migrate
```

**Expected Results:**

- ✅ All CLI commands execute without errors
- ✅ Storage health reports as healthy
- ✅ Integrity checks pass (or report no data if fresh install)

## Phase 3: Core Accessibility Crawling (Regression Testing)

### 3.1 Test Basic Crawl Functionality

```bash
# Test crawling a simple website (inside container)
docker-compose exec cats-app bash

# Run a basic crawl test
node src/core/crawler.js --url https://example.com --max-pages 2 --output test-crawl

# Check if reports were generated
ls -la public/reports/
ls -la public/reports/*/

# Verify JSON report exists and is valid
find public/reports -name "summary.json" -exec cat {} \; | head -20

exit
```

**Expected Results:**

- ✅ Crawl completes successfully
- ✅ Reports generated in public/reports/
- ✅ JSON files contain valid accessibility data
- ✅ HTML reports are accessible

### 3.2 Test Dashboard Integration

```bash
# Access dashboard and verify reports appear
curl -s http://localhost:3000/ | grep -o "test-crawl\|example.com" | head -5

# Test report viewing
curl -f http://localhost:3000/reports/example.com/ || echo "Check if report path exists"
```

## Phase 4: Enhanced Storage Features Testing

### 4.1 Test Backup Functionality

```bash
docker-compose exec cats-app bash

# Create a backup of current reports
npm run storage:backup

# List backups
docker-compose exec cats-app npm run storage backup list

# Verify backup was created
ls -la /app/backups/ || echo "Backups directory structure"

exit
```

### 4.2 Test Migration Utilities

```bash
docker-compose exec cats-app bash

# Test migration dry run
npm run storage migrate all --dry-run --verbose

# Verify migration readiness
npm run storage migrate verify

exit
```

### 4.3 Test Data Integrity

```bash
docker-compose exec cats-app bash

# Run comprehensive integrity check
npm run storage integrity check --verbose

# Test file-specific integrity
find public/reports -name "*.json" -type f | head -1 | xargs -I {} npm run storage integrity file {}

exit
```

## Phase 5: Cloud Storage Emulation Testing

### 5.1 Start GCS Emulator

```bash
# Stop current setup
docker-compose down

# Start with GCS emulator
docker-compose --profile gcs-testing up -d

# Verify emulator is running
curl -f http://localhost:4443/ && echo "✅ GCS Emulator running" || echo "❌ GCS Emulator failed"
```

### 5.2 Test Cloud Storage Mode

```bash
# Create modified docker-compose for cloud testing
cat > docker-compose.test.yml << 'EOF'
version: '3.8'
services:
  cats-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - CATS_USE_CLOUD_STORAGE=true
      - GOOGLE_CLOUD_PROJECT=test-project
      - CATS_STORAGE_BUCKET=test-bucket
      - STORAGE_EMULATOR_HOST=gcs-emulator:4443
    volumes:
      - ./public/reports:/app/public/reports
    depends_on:
      - gcs-emulator

  gcs-emulator:
    image: fsouza/fake-gcs-server:latest
    ports:
      - "4443:4443"
    command: ["-scheme", "http", "-host", "0.0.0.0", "-port", "4443"]
EOF

# Start with cloud storage emulation
docker-compose -f docker-compose.test.yml up -d

# Test cloud storage functionality
docker-compose -f docker-compose.test.yml exec cats-app npm run storage:health

# Test cloud storage connectivity
docker-compose -f docker-compose.test.yml exec cats-app npm run storage health test
```

## Phase 6: End-to-End Regression Testing

### 6.1 Complete Workflow Test

```bash
# Ensure we're back to local storage mode
docker-compose down
docker-compose up -d

# Run complete workflow
docker-compose exec cats-app bash

# 1. Run crawl
node src/core/crawler.js --url https://httpbin.org/html --max-pages 1 --output regression-test

# 2. Verify reports
ls -la public/reports/httpbin.org/

# 3. Test dashboard serves reports
curl -f http://localhost:3000/

# 4. Create backup
npm run storage:backup

# 5. Check integrity
npm run storage:integrity

# 6. Test all CLI commands
npm run storage
npm run storage:health
npm run storage:test

exit
```

### 6.2 Performance and Resource Testing

```bash
# Monitor resource usage
docker stats cats-accessibility-crawler-cats-app-1 --no-stream

# Check logs for any memory/performance issues
docker-compose logs cats-app | grep -i -E "(error|warn|memory|timeout)"

# Verify health check continues to pass
docker-compose ps
```

## 📊 Validation Checklist

After completing all phases, verify:

### ✅ **Core Functionality (No Regressions)**

- [ ] Docker build completes without errors
- [ ] Application starts and becomes healthy
- [ ] Dashboard loads at http://localhost:3000
- [ ] Crawling functionality works (can crawl a test site)
- [ ] Reports are generated correctly
- [ ] Reports are viewable via dashboard
- [ ] Existing npm scripts continue to work

### ✅ **Enhanced Storage Features**

- [ ] Storage health monitoring works
- [ ] Enhanced file operations with retry/fallback
- [ ] Data integrity checks function correctly
- [ ] Migration utilities are available
- [ ] Backup/restore functionality works
- [ ] CLI commands execute without errors
- [ ] Test suite passes (npm run storage:test)

### ✅ **Docker Integration**

- [ ] All new CLI tools work inside container
- [ ] Volume mounts preserve data correctly
- [ ] Health checks pass consistently
- [ ] Resource usage is reasonable
- [ ] No new error messages in logs

### ✅ **Cloud Storage Support**

- [ ] GCS emulator integration works
- [ ] Cloud storage health checks function
- [ ] Fallback mechanisms work properly
- [ ] Configuration switching works correctly

## 🚨 Troubleshooting

### Common Issues and Solutions

#### Docker Build Fails

```bash
# Clean and rebuild
docker-compose down -v
docker system prune -f
docker-compose build --no-cache
```

#### Storage Tests Fail

```bash
# Check file permissions
docker-compose exec cats-app ls -la public/reports/
docker-compose exec cats-app whoami

# Check environment variables
docker-compose exec cats-app env | grep CATS
```

#### CLI Commands Not Found

```bash
# Verify package.json was copied correctly
docker-compose exec cats-app cat package.json | grep storage

# Check if all files are present
docker-compose exec cats-app ls -la src/utils/
```

#### GCS Emulator Issues

```bash
# Check emulator status
curl -v http://localhost:4443/

# Check logs
docker-compose --profile gcs-testing logs gcs-emulator
```

## 🎯 Success Criteria

The testing is successful if:

1. **Zero regressions** - All existing functionality works as before
2. **Enhanced features work** - New storage improvements function correctly
3. **Docker integration** - All features work properly in containerized
   environment
4. **Performance maintained** - No significant performance degradation
5. **Error-free operation** - No new errors or warnings in logs

## 📝 Test Report Template

```markdown
# Docker Testing Report - Storage Persistence Improvements

**Date:** [Current Date] **Tester:** [Your Name] **Branch:**
feature/storage-persistence-improvements **Commit:** [git log --oneline -1]

## Test Results Summary

- [ ] Phase 1: Basic Docker Build ✅/❌
- [ ] Phase 2: Storage Health ✅/❌
- [ ] Phase 3: Core Crawling ✅/❌
- [ ] Phase 4: Enhanced Features ✅/❌
- [ ] Phase 5: Cloud Emulation ✅/❌
- [ ] Phase 6: End-to-End ✅/❌

## Issues Found

[List any issues discovered]

## Recommendations

[Any recommendations for improvement]

## Overall Status

[PASS/FAIL with summary]
```

---

This comprehensive testing approach ensures that the enhanced storage
functionality works correctly in Docker while maintaining backward compatibility
with all existing features.
