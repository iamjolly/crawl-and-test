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
    console.log('🔧 CATS Configuration:');
    console.log(`   ROOT_DIR: ${this.ROOT_DIR}`);
    console.log(`   REPORTS_DIR: ${this.REPORTS_DIR}`);
    console.log(`   TEMPLATES_DIR: ${this.TEMPLATES_DIR}`);
    console.log(`   STYLES_DIR: ${this.STYLES_DIR}`);
    console.log(`   SERVER: ${this.getServerUrl()}`);
    console.log(`   MAX_PAGES: ${this.MAX_PAGES}`);
    console.log(`   WCAG: ${this.DEFAULT_WCAG_VERSION} Level ${this.DEFAULT_WCAG_LEVEL}`);
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
