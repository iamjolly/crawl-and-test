#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');
const { Command } = require('commander');
const pLimit = require('p-limit');
const robotsParser = require('robots-txt-parse');
const url = require('url');
const config = require('./config');
const axe = require('axe-core');
const xml2js = require('xml2js');
const { generateHTMLReport } = require('../generators/html');

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ------------------------------------------------------------------
// CLI
// ------------------------------------------------------------------
const program = new Command();
program
  .requiredOption('-s, --seed <url>', 'Seed URL (must be HTTPS)')
  .option('-d, --depth <num>', 'Maximum crawl depth', (val) => parseInt(val, 10), 2)
  .option('-c, --concurrency <num>', 'Number of parallel browsers', (val) => parseInt(val, 10), 4)
  .option('-o, --output <file>', 'Output JSON file', 'report.json')
  .option('-t, --delay <ms>', 'Delay between requests per domain (ms)', (val) => parseInt(val, 10), 1000)
  .option('-p, --max-pages <num>', 'Maximum number of pages to scan (use 0 for unlimited)', (val) => parseInt(val, 10), config.MAX_PAGES)
  .option('--no-sitemap', 'Skip sitemap discovery and use only link crawling')
  .option('--wcag-version <version>', 'WCAG version to test (2.0, 2.1, 2.2)', config.DEFAULT_WCAG_VERSION)
  .option('--wcag-level <level>', 'WCAG compliance level (A, AA, AAA)', config.DEFAULT_WCAG_LEVEL)
  .option('--custom-tags <tags>', 'Custom axe tags (comma-separated, overrides WCAG options)')
  .option('--html', 'Generate HTML report in addition to JSON')
  .parse(process.argv);

const {
  seed,
  depth: maxDepth,
  concurrency,
  output,
  delay: perDomainDelay,
  maxPages,
  sitemap: useSitemap,
  wcagVersion,
  wcagLevel,
  customTags,
  html: generateHtml,
} = program.opts();

// ------------------------------------------------------------------
// Utils
// ------------------------------------------------------------------
function normalizeUrl(u) {
  const parsed = new URL(u);
  parsed.hash = '';                 // ignore fragments
  // drop default index pages
  if (parsed.pathname.endsWith('/')) parsed.pathname = parsed.pathname.slice(0, -1);
  return parsed.toString();
}

function isSameDomain(u1, u2) {
  return new URL(u1).hostname === new URL(u2).hostname;
}

// ------------------------------------------------------------------
// WCAG Configuration
// ------------------------------------------------------------------
function buildAxeTags(wcagVersion, wcagLevel, customTags) {
  if (customTags) {
    const tags = customTags.split(',').map(tag => tag.trim());
    console.log(`🎯 Using custom tags: ${tags.join(', ')}`);
    return tags;
  }

  const tags = [];
  
  // Add WCAG version tags
  switch (wcagVersion) {
    case '2.0':
      if (wcagLevel === 'A' || wcagLevel === 'AA' || wcagLevel === 'AAA') {
        tags.push('wcag2a');
      }
      if (wcagLevel === 'AA' || wcagLevel === 'AAA') {
        tags.push('wcag2aa');
      }
      if (wcagLevel === 'AAA') {
        tags.push('wcag2aaa');
      }
      break;
      
    case '2.1':
      if (wcagLevel === 'A' || wcagLevel === 'AA' || wcagLevel === 'AAA') {
        tags.push('wcag2a', 'wcag21a');
      }
      if (wcagLevel === 'AA' || wcagLevel === 'AAA') {
        tags.push('wcag2aa', 'wcag21aa');
      }
      if (wcagLevel === 'AAA') {
        tags.push('wcag2aaa', 'wcag21aaa');
      }
      break;
      
    case '2.2':
      if (wcagLevel === 'A' || wcagLevel === 'AA' || wcagLevel === 'AAA') {
        tags.push('wcag2a', 'wcag21a', 'wcag22a');
      }
      if (wcagLevel === 'AA' || wcagLevel === 'AAA') {
        tags.push('wcag2aa', 'wcag21aa', 'wcag22aa');
      }
      if (wcagLevel === 'AAA') {
        tags.push('wcag2aaa', 'wcag21aaa', 'wcag22aaa');
      }
      break;
      
    default:
      console.warn(`⚠️ Unknown WCAG version: ${wcagVersion}, defaulting to 2.0 AA`);
      tags.push('wcag2a', 'wcag2aa');
  }

  console.log(`🎯 Testing WCAG ${wcagVersion} Level ${wcagLevel}: ${tags.join(', ')}`);
  return tags;
}

// ------------------------------------------------------------------
// Report Directory Management
// ------------------------------------------------------------------
function generateReportFilename(domain, wcagVersion, wcagLevel) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  // Remove 'wcag' prefix if it exists to avoid duplication
  const cleanVersion = wcagVersion.startsWith('wcag') ? wcagVersion.substring(4) : wcagVersion;
  return `${domain}_wcag${cleanVersion}_${wcagLevel}_${timestamp}.json`;
}

function generateHtmlFilename(domain, wcagVersion, wcagLevel) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  // Remove 'wcag' prefix if it exists to avoid duplication
  const cleanVersion = wcagVersion.startsWith('wcag') ? wcagVersion.substring(4) : wcagVersion;
  return `${domain}_wcag${cleanVersion}_${wcagLevel}_${timestamp}.html`;
}

async function ensureReportsDirectory(domain) {
  const reportsDir = config.REPORTS_DIR;
  const domainDir = config.getDomainReportsDir(domain);
  
  try {
    await fs.mkdir(reportsDir, { recursive: true });
    await fs.mkdir(domainDir, { recursive: true });
    return domainDir;
  } catch (error) {
    console.error(`Failed to create reports directory: ${error.message}`);
    return process.cwd();
  }
}

// ------------------------------------------------------------------
// Legacy HTML Report Generator (DEPRECATED)
// ------------------------------------------------------------------
// This function has been replaced by generateHTMLReport from regenerate-html.js
// which provides modern templates with navigation and better UX
/*
function generateHtmlReport(results, domain, wcagVersion, wcagLevel) {
  // Note: This function now just provides a simple legacy report
  // The modern template system in regenerate-html.js handles full HTML generation
  // ... [Legacy code commented out for brevity]
}
*/

// ------------------------------------------------------------------
// ------------------------------------------------------------------
// Sitemap parsing
// ------------------------------------------------------------------
async function fetchSitemap(sitemapUrl) {
  try {
    console.log(`  Fetching: ${sitemapUrl}`);
    
    // Use Node.js fetch (available in Node 18+) or fallback to page evaluation
    let content;
    
    try {
      // Try using global fetch first (Node.js 18+)
      const response = await fetch(sitemapUrl);
      if (!response.ok) {
        console.log(`  Response: ${response.status} ${response.statusText}`);
        return null;
      }
      content = await response.text();
    } catch (fetchError) {
      // Fallback to Playwright for older Node.js versions
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      
      try {
        const response = await page.goto(sitemapUrl, { timeout: 10000 });
        if (!response || !response.ok()) {
          console.log(`  Response: ${response?.status()} ${response?.statusText()}`);
          await browser.close();
          return null;
        }
        
        // For XML files, get the raw content
        content = await page.evaluate(() => document.documentElement.outerHTML);
        // Clean up HTML wrapper that browsers add to XML
        content = content.replace(/^.*?<\?xml/, '<?xml').replace(/<\/html>.*$/, '');
      } finally {
        await browser.close();
      }
    }
    
    console.log(`  Content length: ${content.length} bytes`);
    
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);
    
    const urls = [];
    
    // Handle regular sitemap
    if (result.urlset && result.urlset.url) {
      for (const urlEntry of result.urlset.url) {
        if (urlEntry.loc && urlEntry.loc[0]) {
          urls.push(normalizeUrl(urlEntry.loc[0]));
        }
      }
    }
    
    // Handle sitemap index
    if (result.sitemapindex && result.sitemapindex.sitemap) {
      for (const sitemapEntry of result.sitemapindex.sitemap) {
        if (sitemapEntry.loc && sitemapEntry.loc[0]) {
          const subSitemapUrls = await fetchSitemap(sitemapEntry.loc[0]);
          if (subSitemapUrls) {
            urls.push(...subSitemapUrls);
          }
        }
      }
    }
    
    console.log(`  Found ${urls.length} URLs in sitemap`);
    return urls;
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    return null;
  }
}

async function tryLoadSitemap(seedUrl) {
  const parsed = new URL(seedUrl);
  const sitemapUrls = [
    `${parsed.origin}/sitemap.xml`,
    `${parsed.origin}/sitemap_index.xml`,
    `${parsed.origin}/sitemaps.xml`
  ];
  
  for (const sitemapUrl of sitemapUrls) {
    console.log(`Trying to load sitemap: ${sitemapUrl}`);
    const urls = await fetchSitemap(sitemapUrl);
    if (urls && urls.length > 0) {
      console.log(`✓ Found sitemap with ${urls.length} URLs`);
      return urls.filter(u => isSameDomain(seedUrl, u));
    }
  }
  
  console.log('✗ No sitemap found, falling back to discovery crawling');
  return null;
}

// ------------------------------------------------------------------
// Crawler state
// ------------------------------------------------------------------
let queue = [];
const visited = new Set();
const results = [];      // array of { url, pageUrl, errors, ... }
let usingSitemap = false; // track if we're using sitemap mode

// Build axe configuration
const axeTags = buildAxeTags(wcagVersion, wcagLevel, customTags);
const axeConfig = {
  runOnly: {
    type: 'tag',
    values: axeTags,
  },
};

const domainDelays = {}; // domain => last request timestamp

// ------------------------------------------------------------------
// Politeness helper
// ------------------------------------------------------------------
async function politePause(domain) {
  const last = domainDelays[domain] || 0;
  const now = Date.now();
  const wait = perDomainDelay - (now - last);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  domainDelays[domain] = Date.now();
}

// ------------------------------------------------------------------
// Main crawler worker
// ------------------------------------------------------------------
async function crawlPage(pageUrl, currentDepth) {
  const parsed = new URL(pageUrl);
  const domain = parsed.hostname;

  await politePause(domain);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Respect robots.txt
  const robotsTxtUrl = `${parsed.origin}/robots.txt`;
  let robotsTxt = '';
  try {
    robotsTxt = await page.evaluate((url) => fetch(url).then(r => r.text()), robotsTxtUrl);
  } catch (_) {} // ignore errors

  try {
    const r = robotsParser(robotsTxt);
    if (!r.isAllowed('MyCrawler', pageUrl)) {
      console.warn(`Disallowed by robots.txt: ${pageUrl}`);
      await browser.close();
      return;
    }
  } catch (_) {
    // If robots.txt parsing fails, proceed with crawling
  }

  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Inject axe
    await page.addScriptTag({ content: axe.source });

    // Get page title
    const pageTitle = await page.title();

    const axeResult = await page.evaluate(
      (options) => axe.run(document, options),
      axeConfig
    );

    results.push({
      pageUrl,
      pageTitle: pageTitle || '', // Add page title to results
      timestamp: new Date().toISOString(),
      ...axeResult,
    });

    // Extract and enqueue new links (only in discovery mode)
    if (!usingSitemap) {
      const links = await page.$$eval('a[href]', nodes =>
        nodes.map(n => n.href)
      );

      for (const link of links) {
        const norm = normalizeUrl(link);
        if (!visited.has(norm) && isSameDomain(seed, norm) && currentDepth < maxDepth) {
          queue.push({ url: norm, depth: currentDepth + 1 });
          visited.add(norm);
        }
      }
    }
  } catch (e) {
    console.error(`Failed ${pageUrl}: ${e.message}`);
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------------
// Crawl loop with concurrency limit
// ------------------------------------------------------------------
async function main() {
  const limit = pLimit(concurrency);

  // Initialize queue based on mode
  if (useSitemap) {
    console.log('🗺️  Mixed mode: Attempting to load sitemap...');
    const sitemapUrls = await tryLoadSitemap(seed);
    
    if (sitemapUrls && sitemapUrls.length > 0) {
      // Sitemap found - use sitemap URLs (limit to maxPages unless unlimited)
      usingSitemap = true;
      const isUnlimited = maxPages === 0;
      const limitedUrls = isUnlimited ? sitemapUrls : sitemapUrls.slice(0, maxPages);
      queue = limitedUrls.map(url => ({ url, depth: 0 }));
      
      if (isUnlimited) {
        console.log(`📋 Using sitemap with ${sitemapUrls.length} URLs (unlimited mode)`);
      } else {
        console.log(`📋 Using sitemap with ${limitedUrls.length} URLs (limited from ${sitemapUrls.length} total)`);
      }
    } else {
      // No sitemap - fall back to discovery crawling
      usingSitemap = false;
      queue = [{ url: normalizeUrl(seed), depth: 0 }];
      console.log(`🔍 Falling back to discovery crawling from ${seed}`);
    }
  } else {
    // Sitemap disabled - use discovery crawling only
    usingSitemap = false;
    queue = [{ url: normalizeUrl(seed), depth: 0 }];
    console.log(`🔍 Discovery crawling from ${seed} (sitemap disabled)`);
  }

  // Process the queue
  const isUnlimited = maxPages === 0;
  while (queue.length > 0 && (isUnlimited || results.length < maxPages)) {
    const batch = [];
    while (queue.length > 0 && batch.length < concurrency && (isUnlimited || results.length < maxPages)) {
      const { url, depth } = queue.shift();
      if (!visited.has(url) && (isUnlimited || results.length < maxPages)) {
        visited.add(url);
        batch.push(limit(() => crawlPage(url, depth)));
      }
    }

    if (batch.length > 0) {
      await Promise.all(batch);
      const progressMsg = isUnlimited 
        ? `📊 Progress: ${results.length} pages scanned, ${queue.length} remaining`
        : `📊 Progress: ${results.length} pages scanned, ${queue.length} remaining (max: ${maxPages})`;
      console.log(progressMsg);
      
      // Break if we've reached the max pages limit (but not if unlimited)
      if (!isUnlimited && results.length >= maxPages) {
        console.log(`🛑 Reached maximum page limit (${maxPages}), stopping crawl`);
        break;
      }
    }
  }

  // Generate reports with proper directory structure
  const domain = new URL(seed).hostname;
  const reportsDir = await ensureReportsDirectory(domain);
  
  // Determine output filename
  let jsonOutput;
  if (output === 'report.json') {
    // Use default naming if user didn't specify custom output
    jsonOutput = path.join(reportsDir, generateReportFilename(domain, wcagVersion, wcagLevel));
  } else {
    // Use user-specified output in reports directory
    jsonOutput = path.join(reportsDir, output);
  }
  
  // Write JSON report
  await fs.writeFile(jsonOutput, JSON.stringify(results, null, 2), 'utf-8');
  
  // Generate HTML report if requested
  let htmlOutput = null;
  if (generateHtml) {
    const htmlFilename = generateHtmlFilename(domain, wcagVersion, wcagLevel);
    htmlOutput = path.join(reportsDir, htmlFilename);
    // Use modern template system from regenerate-html.js
    const htmlContent = generateHTMLReport(results, htmlFilename);
    await fs.writeFile(htmlOutput, htmlContent, 'utf-8');
  }
  
  const mode = usingSitemap ? 'sitemap' : 'discovery';
  console.log(`✅ Crawled ${results.length} pages using ${mode} mode`);
  console.log(`📄 JSON report: ${jsonOutput}`);
  if (htmlOutput) {
    console.log(`📊 HTML report: ${htmlOutput}`);
  }
  console.log(`📁 Reports directory: ${reportsDir}`);
}

main().catch(err => { console.error(err); process.exit(1); });