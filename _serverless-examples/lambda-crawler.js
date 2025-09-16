/**
 * AWS Lambda function for accessibility crawling
 * Adapts the modular crawler system for serverless execution
 */

const { chromium } = require('playwright');
const axe = require('axe-core');
const AWS = require('aws-sdk');

// Import configuration system with dotenv support
const config = require('../src/core/config');

const s3 = new AWS.S3();

// Note: In a real serverless deployment, you would need to:
// 1. Extract core crawler logic from src/core/crawler.js into reusable modules
// 2. Bundle the src/ directory with your Lambda deployment
// 3. Ensure all dependencies (including dotenv) are included

async function crawlWebsite(event, context) {
  const { 
    seedUrl, 
    maxDepth = 2, 
    maxPages = config.MAX_PAGES || 50, 
    concurrency = 2,
    wcagVersion = config.DEFAULT_WCAG_VERSION || '2.1',
    wcagLevel = config.DEFAULT_WCAG_LEVEL || 'AA'
  } = JSON.parse(event.body);

  try {
    // Execute crawl (using extracted crawler logic)
    const results = await runAccessibilityCrawl({
      seedUrl,
      maxDepth,
      maxPages,
      concurrency,
      wcagVersion,
      wcagLevel
    });

    // Upload JSON results to S3
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const domain = new URL(seedUrl).hostname;
    // Remove 'wcag' prefix if it exists to avoid duplication
    const cleanVersion = wcagVersion.startsWith('wcag') ? wcagVersion.substring(4) : wcagVersion;
    const filename = `${domain}_wcag${cleanVersion}_${wcagLevel}_${timestamp}.json`;
    
    await s3.putObject({
      Bucket: process.env.REPORTS_BUCKET,
      Key: `reports/${domain}/${filename}`,
      Body: JSON.stringify(results, null, 2),
      ContentType: 'application/json'
    }).promise();

    // Trigger report generation
    await triggerReportGeneration({
      domain,
      filename,
      s3Key: `reports/${domain}/${filename}`
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Crawl initiated successfully',
        domain,
        filename,
        downloadUrl: `https://${process.env.REPORTS_BUCKET}.s3.amazonaws.com/reports/${domain}/${filename}`
      })
    };

  } catch (error) {
    console.error('Crawl failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

async function runAccessibilityCrawl(options) {
  // This would contain the core crawling logic extracted from crawler.js
  // Modified to work in serverless environment with proper timeout handling
  
  const browser = await chromium.launch();
  try {
    // Implement crawling logic here
    // Would need to handle Lambda timeout limits (15 minutes max)
    
    return results;
  } finally {
    await browser.close();
  }
}

async function triggerReportGeneration(params) {
  // Trigger another Lambda function to generate HTML reports
  const lambda = new AWS.Lambda();
  
  await lambda.invoke({
    FunctionName: process.env.REPORT_GENERATOR_FUNCTION,
    InvocationType: 'Event', // Async invoke
    Payload: JSON.stringify(params)
  }).promise();
}

module.exports = { crawlWebsite };