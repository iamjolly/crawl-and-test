# Google Cloud Run Deployment Guide

This guide walks you through deploying CATS (Crawl and Test System) to Google Cloud Run for production use or proof-of-concept demonstrations.

## ☁️ Architecture Overview

**CATS on Cloud Run provides:**
- Containerized accessibility crawler with web dashboard
- Auto-scaling from 0 to 5 instances based on demand
- Google Cloud Storage for report persistence
- Global CDN access to reports
- Cost-effective pay-per-use pricing

**Cost Estimates:**
- **POC (1,500 pages/week)**: $5-9/month
- **Production (100,000 pages/week)**: $60-85/month

## 🚀 Quick Deployment

### Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** installed for local testing (optional)

### 1. Set up Google Cloud Project

```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
```

### 2. Create Storage Bucket

```bash
# Create bucket for reports
gsutil mb gs://cats-reports-$PROJECT_ID

# Make bucket publicly readable for report access
gsutil iam ch allUsers:objectViewer gs://cats-reports-$PROJECT_ID
```

### 3. Deploy with Cloud Build

```bash
# Clone and navigate to the project
git clone https://github.com/your-username/crawl-and-test.git
cd crawl-and-test
git checkout feature/google-cloud-run-poc

# Deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_STORAGE_BUCKET=cats-reports-$PROJECT_ID
```

### 4. Access Your Deployment

```bash
# Get the service URL
gcloud run services describe cats-accessibility-crawler \
  --region=us-central1 --format="value(status.url)"
```

Visit the URL to access your CATS dashboard!

## 🔧 Configuration

### Environment Variables

Key environment variables set automatically:
- `CATS_USE_CLOUD_STORAGE=true` - Enables cloud storage
- `CATS_SERVER_HOST=0.0.0.0` - Allows Cloud Run traffic
- `CATS_STORAGE_BUCKET=cats-reports-$PROJECT_ID` - Your bucket name
- `GOOGLE_CLOUD_PROJECT=$PROJECT_ID` - Your project ID

### Custom Configuration

To customize settings, update the Cloud Run service:

```bash
gcloud run services update cats-accessibility-crawler \
  --region=us-central1 \
  --set-env-vars="CATS_MAX_PAGES=50,CATS_WCAG_VERSION=2.2"
```

## 🧪 Local Development & Testing

### Test with Docker Compose

```bash
# Build and run locally
docker-compose up --build

# Access at http://localhost:3000
```

### Test Cloud Storage Integration

```bash
# Run with GCS emulator
docker-compose --profile gcs-testing up
```

## 📊 Monitoring & Scaling

### View Logs

```bash
gcloud logs read --service=cats-accessibility-crawler
```

### Scale Configuration

**Optimized settings for government site accessibility testing:**
- **Memory**: 8GB (increased for browser stability)
- **CPU**: 4 vCPU (improved parallel processing)
- **Timeout**: 60 minutes (for large crawls)
- **Concurrency**: 5 requests per instance (reduced for stability)
- **Max Instances**: 3 (reduced for cost efficiency)
- **Min Instances**: 1 (eliminates cold starts)

**Performance Optimizations:**
- 🚀 Page timeout: 90 seconds (3x longer for slow sites)
- 🔄 Retry logic: 3 attempts with exponential backoff
- ⚡ Wait strategy: `domcontentloaded` (faster loading)
- 🧠 Browser pooling: Reuse browser instances
- 📷 Images disabled: Faster scanning (accessibility-focused)
- 💾 Memory management: Automatic browser cleanup

### Update Scaling

```bash
# Apply performance optimizations
gcloud run services update cats-accessibility-crawler \
  --region=us-central1 \
  --memory=8Gi \
  --cpu=4 \
  --concurrency=5 \
  --max-instances=3 \
  --min-instances=1 \
  --no-cpu-throttling \
  --set-env-vars="CATS_MAX_CONCURRENT_JOBS=1,CATS_DEFAULT_CRAWLER_CONCURRENCY=2,CATS_PAGE_TIMEOUT=90000"
```

## 💰 Cost Optimization

### For POC/Testing
- Current settings are optimal for small-scale testing
- Scales to zero when not in use
- ~$5-9/month for 1,500 pages/week

### For Production
- Consider increasing `--max-instances` for high traffic
- Monitor CPU/Memory usage and adjust accordingly
- Use Cloud CDN for global report access

## 🔐 Security & Access

### Public vs Authenticated Access

**Current**: Public access (no authentication required)
**Recommended for Production**: Add authentication

```bash
# Remove public access
gcloud run services remove-iam-policy-binding cats-accessibility-crawler \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"

# Add specific users
gcloud run services add-iam-policy-binding cats-accessibility-crawler \
  --region=us-central1 \
  --member="user:your-email@domain.com" \
  --role="roles/run.invoker"
```

## 🔄 CI/CD Pipeline

### Automatic Deployment with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - id: 'auth'
      uses: 'google-github-actions/auth@v1'
      with:
        credentials_json: '${{ secrets.GCP_SA_KEY }}'
    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'
    - name: 'Deploy'
      run: |
        gcloud builds submit --config cloudbuild.yaml
```

## 🆘 Troubleshooting

### Common Issues

**Build Timeout**
```bash
# Increase timeout in cloudbuild.yaml
timeout: '2400s'  # 40 minutes
```

**Out of Memory**
```bash
# Increase memory allocation
gcloud run services update cats-accessibility-crawler \
  --memory=8Gi
```

**Playwright Browser Issues**
- Browsers are installed in Dockerfile
- Check logs for browser launch errors
- Consider using `--no-sandbox` flags if needed

### Debug Deployment

```bash
# View build logs
gcloud builds log [BUILD_ID]

# View service details
gcloud run services describe cats-accessibility-crawler \
  --region=us-central1
```

## 🎯 Next Steps

1. **Custom Domain**: Set up custom domain for production
2. **SSL Certificate**: Enable HTTPS with managed certificates
3. **Monitoring**: Set up Cloud Monitoring alerts
4. **Authentication**: Add user authentication for production
5. **Backup**: Set up automated bucket backups

---

Ready to crawl the web for accessibility issues at scale! 🕷️✨