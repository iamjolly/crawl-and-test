#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const { Command } = require('commander');
// p-limit v7+ is ES module only, so we need dynamic import
let pLimit;
const robotsParser = require('robots-parser');
const config = require('./config');
const axe = require('axe-core');
const xml2js = require('xml2js');
const { generateHTMLReport } = require('../generators/html');
const browserPool = require('../utils/browserPool');
const storage = require('../utils/storage');

// Helper function to escape HTML (currently unused but kept for future use)
// function escapeHtml(text) {
//   if (!text) {return '';}
//   return text
//     .replace(/&/g, '&amp;')
//     .replace(/</g, '&lt;')
//     .replace(/>/g, '&gt;')
//     .replace(/"/g, '&quot;')
//     .replace(/'/g, '&#39;');
// }

// ------------------------------------------------------------------
// CLI
// ------------------------------------------------------------------
const program = new Command();
program
  .requiredOption('-s, --seed <url>', 'Seed URL (must be HTTPS)')
  .option('-d, --depth <num>', 'Maximum crawl depth', val => parseInt(val, 10), 2)
  .option('-c, --concurrency <num>', 'Number of parallel browsers', val => parseInt(val, 10), 4)
  .option('-o, --output <file>', 'Output JSON file', 'report.json')
  .option(
    '-t, --delay <ms>',
    'Delay between requests per domain (ms)',
    val => parseInt(val, 10),
    1000
  )
  .option(
    '-p, --max-pages <num>',
    'Maximum number of pages to scan (use 0 for unlimited)',
    val => parseInt(val, 10),
    config.MAX_PAGES
  )
  .option('--no-sitemap', 'Skip sitemap discovery and use only link crawling')
  .option(
    '--wcag-version <version>',
    'WCAG version to test (2.0, 2.1, 2.2)',
    config.DEFAULT_WCAG_VERSION
  )
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
  parsed.hash = ''; // ignore fragments
  // drop default index pages
  if (parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}

async function retryWithDelay(fn, retries = config.MAX_RETRIES, delay = config.RETRY_DELAY_MS) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) {
        throw error; // Final attempt failed
      }

      const currentDelay = delay * Math.pow(1.5, i); // Exponential backoff
      console.warn(
        `⚠️  Attempt ${i + 1} failed: ${error.message}. Retrying in ${currentDelay}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
}

function isSameDomain(u1, u2) {
  const hostname1 = new URL(u1).hostname.toLowerCase();
  const hostname2 = new URL(u2).hostname.toLowerCase();

  // Direct match
  if (hostname1 === hostname2) {
    return true;
  }

  // Handle www/non-www variations
  const withoutWww1 = hostname1.replace(/^www\./, '');
  const withoutWww2 = hostname2.replace(/^www\./, '');

  return withoutWww1 === withoutWww2;
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
// This function has been replaced by generateHTMLReport from src/generators/html.js
// which provides modern templates with navigation and better UX
/*
function generateHtmlReport(results, domain, wcagVersion, wcagLevel) {
  // Note: This function now just provides a simple legacy report
  // The modern template system in src/generators/html.js handles full HTML generation
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
    } catch {
      // Fallback to Playwright for older Node.js versions
      const browser = await browserPool.getBrowser();
      const context = await browserPool.createContext(browser);
      const page = await context.newPage();

      try {
        const response = await page.goto(sitemapUrl, { timeout: config.SITEMAP_TIMEOUT });
        if (!response || !response.ok()) {
          console.log(`  Response: ${response?.status()} ${response?.statusText()}`);
          await context.close();
          await browserPool.returnBrowser(browser);
          return null;
        }

        // For XML files, get the raw content
        content = await page.evaluate(() => document.documentElement.outerHTML);
        // Clean up HTML wrapper that browsers add to XML
        content = content.replace(/^.*?<\?xml/, '<?xml').replace(/<\/html>.*$/, '');
      } finally {
        await context.close();
        await browserPool.returnBrowser(browser);
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

async function tryLoadSitemap(seedUrl, canonicalUrl) {
  const parsed = new URL(canonicalUrl || seedUrl);
  const sitemapUrls = [
    `${parsed.origin}/sitemap.xml`,
    `${parsed.origin}/sitemap_index.xml`,
    `${parsed.origin}/sitemaps.xml`,
  ];

  for (const sitemapUrl of sitemapUrls) {
    console.log(`Trying to load sitemap: ${sitemapUrl}`);
    const urls = await fetchSitemap(sitemapUrl);
    if (urls && urls.length > 0) {
      console.log(`✓ Found sitemap with ${urls.length} URLs`);
      console.log(
        `🔍 Filtering URLs using canonical domain: ${new URL(canonicalUrl || seedUrl).hostname}`
      );

      const filteredUrls = urls.filter(u => {
        const matches = isSameDomain(canonicalUrl || seedUrl, u);
        if (!matches) {
          console.log(`  ❌ Filtered out: ${u} (domain mismatch)`);
        } else {
          console.log(`  ✅ Included: ${u}`);
        }
        return matches;
      });

      console.log(`📊 Sitemap filtering result: ${filteredUrls.length}/${urls.length} URLs kept`);
      return filteredUrls.length > 0 ? filteredUrls : null;
    }
  }

  console.log('✗ No sitemap found, falling back to discovery crawling');
  return null;
}

// ------------------------------------------------------------------
// Domain validation and resolution
// ------------------------------------------------------------------
async function validateDomain(url) {
  console.log(`🔍 Validating domain accessibility for ${url}...`);

  try {
    // Try a simple HEAD request to verify the domain exists and is accessible
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      timeout: 30000, // 30 second timeout for domain validation
    });

    // Check if we got a reasonable response
    if (response.status >= 200 && response.status < 600) {
      console.log(`✅ Domain validation successful (HTTP ${response.status})`);
      return true;
    }

    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  } catch (error) {
    // Check for SSL certificate errors
    const isSslError =
      error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
      error.message.includes('certificate') ||
      error.message.includes('SSL') ||
      error.message.includes('TLS') ||
      (error.cause &&
        (error.cause.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
          error.cause.message?.includes('certificate')));

    // Check for DNS/network errors vs HTTP errors
    // Modern Node.js fetch may wrap DNS errors differently
    const isDnsError =
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.message.includes('getaddrinfo') ||
      error.message.includes('DNS') ||
      (error.message.includes('fetch failed') && !isSslError) || // DNS errors, not SSL
      (error.cause &&
        (error.cause.code === 'ENOTFOUND' || error.cause.message?.includes('getaddrinfo')));

    if (isDnsError) {
      console.error(`❌ Domain validation failed: ${url} does not exist or is not accessible`);
      console.error(`   Network error: ${error.message}`);
      if (error.cause) {
        console.error(`   Root cause: ${error.cause.code} - ${error.cause.message}`);
      }
      throw new Error(
        `Domain "${new URL(url).hostname}" does not exist or is not accessible. Please check the URL and try again.`
      );
    }

    if (isSslError) {
      console.warn(`⚠️ SSL certificate validation issue for ${url}: ${error.message}`);
      console.warn(
        `   This is usually due to incomplete certificate chain configuration on the server.`
      );
      console.warn(`   The crawl will proceed, but the browser may handle SSL differently.`);
      return true; // Allow crawling to proceed - Playwright handles SSL differently
    }

    // For other errors (timeouts, HTTP errors), log but don't fail validation
    console.warn(`⚠️ Domain validation warning for ${url}: ${error.message}`);
    return true; // Allow crawling to proceed
  }
}

async function getCanonicalDomain(url) {
  try {
    // First try with fetch for HTTP-level redirects (faster)
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const fetchFinalUrl = response.url;

    // Use Playwright to handle meta refresh and JavaScript redirects
    const browser = await browserPool.getBrowser();
    const context = await browserPool.createContext(browser);
    const page = await context.newPage();

    try {
      await page.goto(fetchFinalUrl, {
        waitUntil: config.WAIT_STRATEGY,
        timeout: config.SITEMAP_TIMEOUT,
      });
      const playwrightFinalUrl = page.url();
      await context.close();
      await browserPool.returnBrowser(browser);

      return new URL(playwrightFinalUrl).hostname;
    } catch (playwrightError) {
      await context.close();
      await browserPool.returnBrowser(browser);
      // Fall back to fetch result if Playwright fails
      console.warn(
        `Playwright redirect check failed, using fetch result: ${playwrightError.message}`
      );
      return new URL(fetchFinalUrl).hostname;
    }
  } catch (error) {
    // Check for DNS/network errors that indicate domain doesn't exist
    if (
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.message.includes('getaddrinfo') ||
      error.message.includes('DNS') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('net::ERR_NAME_NOT_RESOLVED')
    ) {
      throw new Error(
        `Domain "${new URL(url).hostname}" does not exist or is not accessible. Network error: ${error.message}`
      );
    }

    // For other errors (timeouts, etc.), fall back to original URL
    console.warn(`Could not check redirects for ${url}: ${error.message}`);
    return new URL(url).hostname;
  }
}

// ------------------------------------------------------------------
// Crawler state
// ------------------------------------------------------------------
let queue = [];
const visited = new Set();
const results = []; // array of { url, pageUrl, errors, ... }
let usingSitemap = false; // track if we're using sitemap mode
let canonicalSeed = null; // canonical seed URL after following redirects

// Build axe configuration
const axeTags = buildAxeTags(wcagVersion, wcagLevel, customTags);
const axeConfig = {
  runOnly: {
    type: 'tag',
    values: axeTags,
  },
};

// Ensure maxPages is a number (can come as string from dashboard)
const maxPagesNum = typeof maxPages === 'string' ? parseInt(maxPages, 10) : maxPages;

const domainDelays = {}; // domain => last request timestamp

// ------------------------------------------------------------------
// Politeness helper
// ------------------------------------------------------------------
async function politePause(domain) {
  const last = domainDelays[domain] || 0;
  const now = Date.now();
  const wait = perDomainDelay - (now - last);
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }
  domainDelays[domain] = Date.now();
}

// ------------------------------------------------------------------
// Main crawler worker
// ------------------------------------------------------------------
async function crawlPage(pageUrl, currentDepth) {
  const parsed = new URL(pageUrl);
  const domain = parsed.hostname;

  await politePause(domain);

  const browser = await browserPool.getBrowser();
  const context = await browserPool.createContext(browser);
  const page = await context.newPage();

  // Respect robots.txt
  const robotsTxtUrl = `${parsed.origin}/robots.txt`;
  try {
    // Use browser context to fetch robots.txt instead of page.evaluate to avoid CORS issues
    const response = await context.request.get(robotsTxtUrl);
    const robotsTxt = await response.text();
    const r = robotsParser(robotsTxtUrl, robotsTxt);
    if (!r.isAllowed(pageUrl, 'MyCrawler')) {
      console.warn(`Disallowed by robots.txt: ${pageUrl}`);
      await browser.close();
      return;
    }
  } catch (error) {
    // If robots.txt parsing fails, proceed with crawling
    console.warn(`Could not fetch robots.txt: ${error.message}`);
  }

  try {
    // Use retry logic for page scanning
    const scanResult = await retryWithDelay(async () => {
      await page.goto(pageUrl, {
        waitUntil: config.WAIT_STRATEGY,
        timeout: config.PAGE_NAVIGATION_TIMEOUT,
      });

      // Inject axe
      await page.addScriptTag({ content: axe.source });

      // Get page title
      const pageTitle = await page.title();

      const axeResult = await page.evaluate(options => axe.run(document, options), axeConfig);

      return {
        pageTitle: pageTitle || '',
        axeResult,
      };
    });

    results.push({
      pageUrl,
      pageTitle: scanResult.pageTitle,
      timestamp: new Date().toISOString(),
      ...scanResult.axeResult,
    });

    // Extract and enqueue new links (only in discovery mode)
    if (!usingSitemap) {
      const links = await page.$$eval('a[href]', nodes => nodes.map(n => n.href));

      for (const link of links) {
        const norm = normalizeUrl(link);
        if (!visited.has(norm) && isSameDomain(canonicalSeed, norm) && currentDepth < maxDepth) {
          queue.push({ url: norm, depth: currentDepth + 1 });
          visited.add(norm);
        }
      }
    }

    console.log(
      `✅ ${pageUrl} - ${scanResult.axeResult.violations?.length || 0} violations, ${
        scanResult.axeResult.passes?.length || 0
      } passes`
    );
  } catch (error) {
    console.error(
      `❌ Failed to scan ${pageUrl} after ${config.MAX_RETRIES} retries:`,
      error.message
    );
    results.push({
      pageUrl,
      pageTitle: '',
      timestamp: new Date().toISOString(),
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
      error: `Failed after ${config.MAX_RETRIES} retries: ${error.message}`,
    });
  } finally {
    await context.close();
    await browserPool.returnBrowser(browser);
  }
}

// ------------------------------------------------------------------
// Crawl loop with concurrency limit
// ------------------------------------------------------------------
async function main() {
  // Dynamically import p-limit (ES module)
  if (!pLimit) {
    const pLimitModule = await import('p-limit');
    pLimit = pLimitModule.default;
  }
  const limit = pLimit(concurrency);

  // First, validate that the domain exists and is accessible
  await validateDomain(seed);

  // Get canonical domain for proper sitemap filtering
  console.log(`🔍 Checking canonical domain for ${seed}...`);
  const canonicalDomain = await getCanonicalDomain(seed);
  canonicalSeed = `https://${canonicalDomain}`;
  console.log(`✅ Canonical domain: ${canonicalDomain}`);

  // Initialize queue based on mode
  if (useSitemap) {
    console.log('🗺️  Mixed mode: Attempting to load sitemap...');
    const sitemapUrls = await tryLoadSitemap(seed, canonicalSeed);

    if (sitemapUrls && sitemapUrls.length > 0) {
      // Sitemap found - use sitemap URLs (limit to maxPages unless unlimited)
      usingSitemap = true;
      const isUnlimited = maxPagesNum === 0;
      const limitedUrls = isUnlimited ? sitemapUrls : sitemapUrls.slice(0, maxPagesNum);
      queue = limitedUrls.map(url => ({ url, depth: 0 }));

      if (isUnlimited) {
        console.log(`📋 Using sitemap with ${sitemapUrls.length} URLs (unlimited mode)`);
      } else {
        console.log(
          `📋 Using sitemap with ${limitedUrls.length} URLs (limited from ${sitemapUrls.length} total)`
        );
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
  const isUnlimited = maxPagesNum === 0;
  while (queue.length > 0 && (isUnlimited || results.length < maxPagesNum)) {
    const batch = [];
    while (
      queue.length > 0 &&
      batch.length < concurrency &&
      (isUnlimited || results.length < maxPagesNum)
    ) {
      const { url, depth } = queue.shift();
      if (!visited.has(url) && (isUnlimited || results.length < maxPagesNum)) {
        visited.add(url);
        batch.push(limit(() => crawlPage(url, depth)));
      }
    }

    if (batch.length > 0) {
      await Promise.all(batch);

      // Check for early exit conditions - if all recent pages are failing with network errors
      if (results.length >= 3) {
        // Only check after we have some results
        const recentResults = results.slice(-3); // Check last 3 results
        const networkErrors = recentResults.filter(
          result =>
            result.error &&
            (result.error.includes('ENOTFOUND') ||
              result.error.includes('does not exist') ||
              result.error.includes('DNS') ||
              result.error.includes('net::ERR_NAME_NOT_RESOLVED') ||
              result.error.includes('getaddrinfo'))
        );

        // If all recent results are network errors, exit early
        if (networkErrors.length === recentResults.length && networkErrors.length > 0) {
          console.error(`🛑 Stopping crawl: All recent pages are failing with network errors`);
          console.error(`   This suggests the domain may not exist or be accessible`);
          break;
        }
      }

      const progressMsg = isUnlimited
        ? `📊 Progress: ${results.length} pages scanned, ${queue.length} remaining`
        : `📊 Progress: ${results.length} pages scanned, ${queue.length} remaining (max: ${maxPagesNum})`;
      console.log(progressMsg);

      // Break if we've reached the max pages limit (but not if unlimited)
      if (!isUnlimited && results.length >= maxPagesNum) {
        console.log(`🛑 Reached maximum page limit (${maxPagesNum}), stopping crawl`);
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

  // Write JSON report using enhanced storage system
  const jsonRelativePath = path.relative(config.PUBLIC_DIR, jsonOutput);
  const saveResult = await storage.saveFile(jsonRelativePath, JSON.stringify(results, null, 2), {
    contentType: 'application/json',
  });

  if (saveResult.fallback) {
    console.warn(`⚠️  JSON report saved to local storage (fallback): ${saveResult.error}`);
  }

  // Generate HTML report if requested
  let htmlOutput = null;
  if (generateHtml) {
    const htmlFilename = generateHtmlFilename(domain, wcagVersion, wcagLevel);
    htmlOutput = path.join(reportsDir, htmlFilename);
    // Use modern template system from src/generators/html.js
    const htmlContent = generateHTMLReport(results, htmlFilename);

    // Save HTML report using enhanced storage system
    const htmlRelativePath = path.relative(config.PUBLIC_DIR, htmlOutput);
    const htmlSaveResult = await storage.saveFile(htmlRelativePath, htmlContent, {
      contentType: 'text/html',
    });

    if (htmlSaveResult.fallback) {
      console.warn(`⚠️  HTML report saved to local storage (fallback): ${htmlSaveResult.error}`);
    }
  }

  const mode = usingSitemap ? 'sitemap' : 'discovery';
  console.log(`✅ Crawled ${results.length} pages using ${mode} mode`);
  console.log(`📄 JSON report: ${jsonOutput}`);
  if (htmlOutput) {
    console.log(`📊 HTML report: ${htmlOutput}`);
  }
  console.log(`📁 Reports directory: ${reportsDir}`);

  // Clean up browser pool
  await browserPool.cleanup();
}

main().catch(async err => {
  console.error('💥 Crawl failed:', err.message);

  // If it's a domain validation error, provide helpful guidance
  if (err.message.includes('does not exist or is not accessible')) {
    console.error('');
    console.error('🔧 Troubleshooting tips:');
    console.error('   • Check that the domain name is spelled correctly');
    console.error('   • Verify the domain exists by visiting it in a browser');
    console.error('   • Try with "www" prefix if the domain redirects (e.g., www.example.com)');
    console.error('   • Ensure the domain is publicly accessible (not behind VPN/firewall)');
  }

  await browserPool.cleanup();
  process.exit(1);
});
