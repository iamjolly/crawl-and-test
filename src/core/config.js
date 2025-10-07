/**
 * CATS Configuration Module
 *
 * Centralized configuration management using environment variables with sensible defaults.
 * This module consolidates all configurable paths and settings to prevent configuration drift.
 *
 * Automatically loads .env file if present.
 */

// Load environment variables from .env file
require('dotenv').config();

const path = require('path');

/**
 * Load configuration from environment variables with defaults
 */
class CATSConfig {
  constructor() {
    // Base directories
    this.ROOT_DIR = process.env.CATS_ROOT_DIR || process.cwd();
    this.PUBLIC_DIR = process.env.CATS_PUBLIC_DIR || path.join(this.ROOT_DIR, 'public');
    this.SRC_DIR = process.env.CATS_SRC_DIR || path.join(this.ROOT_DIR, 'src');
    this.DATA_DIR = process.env.CATS_DATA_DIR || path.join(this.ROOT_DIR, 'data');

    // Reports configuration
    this.REPORTS_DIR = process.env.CATS_REPORTS_DIR || path.join(this.PUBLIC_DIR, 'reports');
    this.LEGACY_REPORTS_DIR = process.env.CATS_LEGACY_REPORTS_DIR || this.REPORTS_DIR;

    // Template and asset directories
    this.TEMPLATES_DIR = process.env.CATS_TEMPLATES_DIR || path.join(this.SRC_DIR, 'templates');
    this.STYLES_DIR = process.env.CATS_STYLES_DIR || path.join(this.SRC_DIR, 'styles');
    this.SCRIPTS_DIR = process.env.CATS_SCRIPTS_DIR || path.join(this.SRC_DIR, 'scripts');
    this.PUBLIC_STYLES_DIR =
      process.env.CATS_PUBLIC_STYLES_DIR || path.join(this.PUBLIC_DIR, 'styles');
    this.PUBLIC_SCRIPTS_DIR =
      process.env.CATS_PUBLIC_SCRIPTS_DIR || path.join(this.PUBLIC_DIR, 'scripts');

    // Data files
    this.WCAG_DATA_FILE = process.env.CATS_WCAG_DATA_FILE || path.join(this.DATA_DIR, 'wcag.json');

    // Server configuration
    this.SERVER_PORT = parseInt(process.env.CATS_SERVER_PORT || '3000', 10);
    this.SERVER_HOST = process.env.CATS_SERVER_HOST || 'localhost';

    // Crawler configuration
    this.MAX_PAGES = parseInt(process.env.CATS_MAX_PAGES || '25', 10);
    this.DEFAULT_WCAG_VERSION = process.env.CATS_WCAG_VERSION || '2.1';
    this.DEFAULT_WCAG_LEVEL = process.env.CATS_WCAG_LEVEL || 'AA';

    // Job concurrency configuration
    this.MAX_CONCURRENT_JOBS = parseInt(process.env.CATS_MAX_CONCURRENT_JOBS || '3', 10);
    this.DEFAULT_CRAWLER_CONCURRENCY = parseInt(
      process.env.CATS_DEFAULT_CRAWLER_CONCURRENCY || '4',
      10
    );
    this.JOB_CLEANUP_DELAY_MS = parseInt(process.env.CATS_JOB_CLEANUP_DELAY_MS || '300000', 10); // 5 minutes
    this.MAX_JOB_RUNTIME_MS = parseInt(process.env.CATS_MAX_JOB_RUNTIME_MS || '3600000', 10); // 1 hour

    // Performance and timeout configuration
    this.PAGE_NAVIGATION_TIMEOUT = parseInt(process.env.CATS_PAGE_TIMEOUT || '90000', 10); // 90 seconds (was 30s)
    this.SITEMAP_TIMEOUT = parseInt(process.env.CATS_SITEMAP_TIMEOUT || '20000', 10); // 20 seconds (was 10s)
    this.ROBOTS_TIMEOUT = parseInt(process.env.CATS_ROBOTS_TIMEOUT || '10000', 10); // 10 seconds
    this.MAX_RETRIES = parseInt(process.env.CATS_MAX_RETRIES || '3', 10); // Retry failed pages
    this.RETRY_DELAY_MS = parseInt(process.env.CATS_RETRY_DELAY_MS || '2000', 10); // 2 second base delay
    this.WAIT_STRATEGY = process.env.CATS_WAIT_STRATEGY || 'domcontentloaded'; // 'networkidle' or 'domcontentloaded'

    // Browser optimization settings
    this.BROWSER_POOL_SIZE = parseInt(process.env.CATS_BROWSER_POOL_SIZE || '2', 10); // Shared browser instances
    this.BROWSER_MEMORY_LIMIT_MB = parseInt(process.env.CATS_BROWSER_MEMORY_LIMIT_MB || '1024', 10); // 1GB per browser
    this.DISABLE_IMAGES = process.env.CATS_DISABLE_IMAGES !== 'false'; // Default: true (faster loading)
    this.DISABLE_CSS = process.env.CATS_DISABLE_CSS === 'true'; // Default: false (keep CSS for layout)

    // Cloud environment detection
    this.IS_CLOUD_RUN = !!process.env.K_SERVICE || process.env.NODE_ENV === 'production';

    // Cloud Storage configuration
    this.USE_CLOUD_STORAGE = process.env.CATS_USE_CLOUD_STORAGE === 'true';
    this.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    this.STORAGE_BUCKET = process.env.CATS_STORAGE_BUCKET;

    // Application branding
    this.APP_NAME = process.env.CATS_APP_NAME || 'CATS';
    this.APP_FULL_NAME = process.env.CATS_APP_FULL_NAME || 'CATS (Crawl and Test System)';
    this.APP_DESCRIPTION =
      process.env.CATS_APP_DESCRIPTION || 'Automated accessibility testing and reporting system';
  }

  /**
   * Get the reports directory for a specific domain
   * @param {string} domain - The domain name
   * @returns {string} Full path to the domain's reports directory
   */
  getDomainReportsDir(domain) {
    return path.join(this.REPORTS_DIR, this.sanitizeDomainName(domain));
  }

  /**
   * Get the legacy reports directory for a specific domain
   * @param {string} domain - The domain name
   * @returns {string} Full path to the domain's legacy reports directory
   */
  getLegacyDomainReportsDir(domain) {
    return path.join(this.LEGACY_REPORTS_DIR, this.sanitizeDomainName(domain));
  }

  /**
   * Sanitize domain name for use in file system paths
   * @param {string} domain - The domain name to sanitize
   * @returns {string} Sanitized domain name safe for file system
   */
  sanitizeDomainName(domain) {
    return domain.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  /**
   * Get server URL
   * @returns {string} Full server URL
   */
  getServerUrl() {
    return `http://${this.SERVER_HOST}:${this.SERVER_PORT}`;
  }

  /**
   * Log current configuration (useful for debugging)
   */
  logConfig() {
    /* eslint-disable no-console */
    console.log('🔧 CATS Configuration:');
    console.log(`   ROOT_DIR: ${this.ROOT_DIR}`);
    console.log(`   REPORTS_DIR: ${this.REPORTS_DIR}`);
    console.log(`   TEMPLATES_DIR: ${this.TEMPLATES_DIR}`);
    console.log(`   STYLES_DIR: ${this.STYLES_DIR}`);
    console.log(`   SERVER: ${this.getServerUrl()}`);
    console.log(`   MAX_PAGES: ${this.MAX_PAGES}`);
    console.log(`   WCAG: ${this.DEFAULT_WCAG_VERSION} Level ${this.DEFAULT_WCAG_LEVEL}`);
    console.log(
      `   CONCURRENCY: ${this.MAX_CONCURRENT_JOBS} jobs, ${this.DEFAULT_CRAWLER_CONCURRENCY} browsers/job`
    );
    console.log(`   STORAGE: ${this.USE_CLOUD_STORAGE ? `GCS (${this.STORAGE_BUCKET})` : 'Local'}`);
    console.log(
      `   TIMEOUTS: Page=${this.PAGE_NAVIGATION_TIMEOUT}ms, Sitemap=${this.SITEMAP_TIMEOUT}ms`
    );
    console.log(`   RETRIES: Max=${this.MAX_RETRIES}, Delay=${this.RETRY_DELAY_MS}ms`);
    console.log(
      `   BROWSER: Strategy=${this.WAIT_STRATEGY}, Pool=${this.BROWSER_POOL_SIZE}, Images=${!this.DISABLE_IMAGES}`
    );
    console.log(`   ENVIRONMENT: ${this.IS_CLOUD_RUN ? 'Cloud Run' : 'Local'}`);
    /* eslint-enable no-console */
  }

  /**
   * Validate that required directories exist
   * @returns {Array} Array of missing directories
   */
  validateDirectories() {
    const fs = require('fs');
    const requiredDirs = [this.SRC_DIR, this.TEMPLATES_DIR, this.STYLES_DIR, this.SCRIPTS_DIR];

    const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));
    return missingDirs;
  }
}

// Export singleton instance
module.exports = new CATSConfig();
