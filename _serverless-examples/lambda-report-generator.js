/**
 * AWS Lambda function for HTML report generation
 * Adapts the modular HTML generator system for serverless execution
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Import configuration system with dotenv support
const config = require('../src/core/config');

const s3 = new AWS.S3();

// Note: In a real serverless deployment, you would need to:
// 1. Bundle the entire src/ directory with your Lambda deployment
// 2. Include all templates from src/templates/
// 3. Include all styles from src/styles/
// 4. Include all scripts from src/scripts/
// 5. Adapt the HTML generator from src/generators/html.js for serverless execution

async function generateReport(event, context) {
  const { domain, filename, s3Key } = event;

  try {
    // Download JSON report from S3
    const jsonData = await s3
      .getObject({
        Bucket: process.env.REPORTS_BUCKET,
        Key: s3Key,
      })
      .promise();

    const reportData = JSON.parse(jsonData.Body.toString());

    // Generate HTML using existing template system
    const htmlContent = await generateHTMLReport(reportData, filename);

    // Generate HTML filename
    const htmlFilename = filename.replace('.json', '.html');
    const htmlKey = s3Key.replace('.json', '.html');

    // Upload HTML report to S3
    await s3
      .putObject({
        Bucket: process.env.REPORTS_BUCKET,
        Key: htmlKey,
        Body: htmlContent,
        ContentType: 'text/html',
      })
      .promise();

    // Copy CSS and JS assets if not already present
    await ensureAssetsInS3();

    // Trigger static site rebuild (if using Eleventy with build hooks)
    await triggerStaticSiteRebuild();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        htmlUrl: `https://${process.env.REPORTS_BUCKET}.s3.amazonaws.com/${htmlKey}`,
        jsonUrl: `https://${process.env.REPORTS_BUCKET}.s3.amazonaws.com/${s3Key}`,
      }),
    };
  } catch (error) {
    console.error('Report generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
}

async function generateHTMLReport(data, filename) {
  // This would contain the HTML generation logic from src/generators/html.js
  // Templates would be bundled with the Lambda or stored in S3

  // Load templates from local bundle or S3
  const templates = await loadTemplates();

  // Generate HTML using the modular template system
  return generateReportHTML(data, filename, templates);
}

async function loadTemplates() {
  // Templates should be bundled from src/templates/ directory:
  // - src/templates/base.html
  // - src/templates/summary-card.html
  // - src/templates/page-card.html
  // - src/templates/pages-section.html
  // - src/templates/no-issues.html

  return {
    base: await loadTemplate('base'),
    summaryCard: await loadTemplate('summary-card'),
    pageCard: await loadTemplate('page-card'),
    pagesSection: await loadTemplate('pages-section'),
    noIssues: await loadTemplate('no-issues'),
  };
}

async function ensureAssetsInS3() {
  // Ensure CSS and JS files are uploaded to S3 from the new structure:
  // - src/styles/report.css
  // - src/styles/accordion.css
  // - src/styles/accessibility.css
  // - src/scripts/accordion.js
  // - src/scripts/utils.js

  const assets = [
    'styles/report.css',
    'styles/accordion.css',
    'styles/accessibility.css',
    'scripts/accordion.js',
    'scripts/utils.js',
  ];

  for (const asset of assets) {
    const exists = await checkAssetExists(asset);
    if (!exists) {
      await uploadAsset(asset);
    }
  }
}

async function triggerStaticSiteRebuild() {
  // Trigger Eleventy rebuild via webhook or API
  // This could be Netlify build hook, Vercel deployment, etc.

  if (process.env.BUILD_HOOK_URL) {
    const https = require('https');
    // Trigger build hook
  }
}

module.exports = { generateReport };
