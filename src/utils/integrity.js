/**
 * Data Integrity Utilities for CATS
 * Provides comprehensive data validation and integrity checking
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../core/config');
const storage = require('./storage');

/**
 * Integrity check status
 */
const INTEGRITY_STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  MISSING: 'missing',
  ERROR: 'error',
  CORRUPTED: 'corrupted',
};

/**
 * Calculate SHA-256 hash of content
 */
function calculateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Validate JSON file structure
 */
function validateJsonStructure(content, expectedStructure = null) {
  try {
    const parsed = JSON.parse(content);

    // Basic validation for CATS report structure
    if (expectedStructure === 'report') {
      const requiredFields = ['domain', 'timestamp', 'pages', 'summary'];
      const missingFields = requiredFields.filter(field => !(field in parsed));

      if (missingFields.length > 0) {
        return {
          valid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        };
      }

      // Validate pages array
      if (!Array.isArray(parsed.pages)) {
        return {
          valid: false,
          error: 'Pages field must be an array',
        };
      }

      // Validate each page has required structure
      for (let i = 0; i < parsed.pages.length; i++) {
        const page = parsed.pages[i];
        const pageRequiredFields = ['url', 'results'];

        const pageMissingFields = pageRequiredFields.filter(field => !(field in page));
        if (pageMissingFields.length > 0) {
          return {
            valid: false,
            error: `Page ${i}: Missing required fields: ${pageMissingFields.join(', ')}`,
          };
        }
      }
    }

    return { valid: true, parsed };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON: ${error.message}`,
    };
  }
}

/**
 * Validate HTML file structure
 */
function validateHtmlStructure(content) {
  try {
    // Basic HTML validation
    if (!content.includes('<!DOCTYPE html>') && !content.includes('<html')) {
      return {
        valid: false,
        error: 'Invalid HTML: Missing DOCTYPE or html tag',
      };
    }

    // Check for CATS-specific elements
    if (
      content.includes('CATS (Crawl and Test System)') ||
      content.includes('accessibility-report')
    ) {
      return { valid: true };
    }

    return {
      valid: false,
      error: 'HTML does not appear to be a CATS report',
    };
  } catch (error) {
    return {
      valid: false,
      error: `HTML validation error: ${error.message}`,
    };
  }
}

/**
 * Check file integrity
 */
async function checkFileIntegrity(filePath, options = {}) {
  const { checkContent = true, validateStructure = true, expectedHash = null } = options;

  const result = {
    filePath,
    status: INTEGRITY_STATUS.VALID,
    size: null,
    hash: null,
    contentValid: null,
    structureValid: null,
    errors: [],
    warnings: [],
    checkedAt: new Date().toISOString(),
  };

  try {
    // Check if file exists and get content
    let content;
    let fileExists = false;

    if (config.USE_CLOUD_STORAGE) {
      fileExists = await storage.fileExists(filePath);
      if (fileExists) {
        content = await storage.readFile(filePath);
      }
    } else {
      const fullPath = path.join(config.PUBLIC_DIR, filePath);
      try {
        await fs.access(fullPath);
        fileExists = true;
        content = await fs.readFile(fullPath, 'utf8');
      } catch {
        fileExists = false;
      }
    }

    if (!fileExists) {
      result.status = INTEGRITY_STATUS.MISSING;
      result.errors.push('File does not exist');
      return result;
    }

    // Calculate basic properties
    result.size = Buffer.byteLength(content, 'utf8');
    result.hash = calculateHash(content);

    // Check against expected hash if provided
    if (expectedHash && result.hash !== expectedHash) {
      result.status = INTEGRITY_STATUS.CORRUPTED;
      result.errors.push(`Hash mismatch. Expected: ${expectedHash}, Got: ${result.hash}`);
      return result;
    }

    // Content validation
    if (checkContent) {
      if (content.length === 0) {
        result.status = INTEGRITY_STATUS.INVALID;
        result.errors.push('File is empty');
        return result;
      }

      // Check for basic content issues
      if (content.includes('\0')) {
        result.warnings.push('File contains null bytes');
      }

      if (content.length < 10) {
        result.warnings.push('File content is very short');
      }

      result.contentValid = true;
    }

    // Structure validation based on file type
    if (validateStructure) {
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.json') {
        const structureType = filePath.includes('summary.json') ? 'report' : null;
        const validation = validateJsonStructure(content, structureType);

        result.structureValid = validation.valid;

        if (!validation.valid) {
          result.status = INTEGRITY_STATUS.INVALID;
          result.errors.push(`JSON structure invalid: ${validation.error}`);
        }
      } else if (ext === '.html') {
        const validation = validateHtmlStructure(content);

        result.structureValid = validation.valid;

        if (!validation.valid) {
          result.warnings.push(`HTML structure issue: ${validation.error}`);
        }
      } else {
        result.structureValid = null; // Unknown file type
      }
    }

    // Final status determination
    if (result.errors.length === 0) {
      result.status = INTEGRITY_STATUS.VALID;
    }
  } catch (error) {
    result.status = INTEGRITY_STATUS.ERROR;
    result.errors.push(`Integrity check failed: ${error.message}`);
  }

  return result;
}

/**
 * Check integrity of all files in a domain
 */
async function checkDomainIntegrity(domain, options = {}) {
  const { verbose = false, includeDetails = false } = options;

  console.log(`🔍 Checking integrity for domain: ${domain}`);

  const results = {
    domain,
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    missingFiles: 0,
    errorFiles: 0,
    files: [],
    summary: {},
    checkedAt: new Date().toISOString(),
  };

  try {
    // Get list of files for this domain
    let files = [];

    if (config.USE_CLOUD_STORAGE) {
      files = await storage.listFiles(`reports/${domain}/`);
    } else {
      const domainDir = path.join(config.REPORTS_DIR, domain);
      try {
        const allFiles = await getAllFilesRecursive(domainDir);
        files = allFiles.map(f => path.relative(config.PUBLIC_DIR, f));
      } catch (error) {
        console.error(`❌ Failed to list files for ${domain}: ${error.message}`);
        results.summary.error = error.message;
        return results;
      }
    }

    results.totalFiles = files.length;

    if (files.length === 0) {
      console.log(`⚠️  No files found for domain: ${domain}`);
      return results;
    }

    // Check each file
    for (const filePath of files) {
      if (verbose) {
        console.log(`🔍 Checking: ${filePath}`);
      }

      const fileResult = await checkFileIntegrity(filePath, options);

      if (includeDetails) {
        results.files.push(fileResult);
      }

      // Update counters
      switch (fileResult.status) {
        case INTEGRITY_STATUS.VALID:
          results.validFiles++;
          break;
        case INTEGRITY_STATUS.INVALID:
        case INTEGRITY_STATUS.CORRUPTED:
          results.invalidFiles++;
          if (verbose) {
            console.error(`❌ Invalid: ${filePath} - ${fileResult.errors.join(', ')}`);
          }
          break;
        case INTEGRITY_STATUS.MISSING:
          results.missingFiles++;
          if (verbose) {
            console.error(`❌ Missing: ${filePath}`);
          }
          break;
        case INTEGRITY_STATUS.ERROR:
          results.errorFiles++;
          if (verbose) {
            console.error(`❌ Error: ${filePath} - ${fileResult.errors.join(', ')}`);
          }
          break;
      }
    }

    // Generate summary
    results.summary = {
      healthy: results.invalidFiles === 0 && results.missingFiles === 0 && results.errorFiles === 0,
      successRate: ((results.validFiles / results.totalFiles) * 100).toFixed(2),
      issues: results.invalidFiles + results.missingFiles + results.errorFiles,
    };

    const status = results.summary.healthy ? '✅' : '⚠️';
    console.log(
      `${status} ${domain}: ${results.validFiles}/${results.totalFiles} files valid (${results.summary.successRate}%)`
    );

    if (!results.summary.healthy) {
      console.log(
        `   Issues: ${results.invalidFiles} invalid, ${results.missingFiles} missing, ${results.errorFiles} errors`
      );
    }
  } catch (error) {
    console.error(`❌ Domain integrity check failed: ${error.message}`);
    results.summary.error = error.message;
  }

  return results;
}

/**
 * Check integrity of all domains
 */
async function checkAllDomainsIntegrity(options = {}) {
  const { verbose = false, includeDetails = false } = options;

  console.log(`🔍 Checking integrity for all domains`);

  const results = {
    totalDomains: 0,
    healthyDomains: 0,
    unhealthyDomains: 0,
    totalFiles: 0,
    validFiles: 0,
    invalidFiles: 0,
    missingFiles: 0,
    errorFiles: 0,
    domains: [],
    summary: {},
    checkedAt: new Date().toISOString(),
  };

  try {
    // Get list of domains
    let domains = [];

    if (config.USE_CLOUD_STORAGE) {
      const files = await storage.listFiles('reports/');
      const domainSet = new Set();

      files.forEach(file => {
        const parts = file.split('/');
        if (parts.length > 1 && parts[0] === 'reports') {
          domainSet.add(parts[1]);
        }
      });

      domains = Array.from(domainSet);
    } else {
      try {
        const entries = await fs.readdir(config.REPORTS_DIR, { withFileTypes: true });
        domains = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
      } catch (error) {
        throw new Error(`Failed to list domains: ${error.message}`);
      }
    }

    results.totalDomains = domains.length;

    if (domains.length === 0) {
      console.log(`⚠️  No domains found`);
      return results;
    }

    console.log(`📊 Found ${domains.length} domains to check`);

    // Check each domain
    for (const domain of domains) {
      const domainResult = await checkDomainIntegrity(domain, { verbose, includeDetails });

      if (includeDetails) {
        results.domains.push(domainResult);
      }

      // Update overall counters
      results.totalFiles += domainResult.totalFiles;
      results.validFiles += domainResult.validFiles;
      results.invalidFiles += domainResult.invalidFiles;
      results.missingFiles += domainResult.missingFiles;
      results.errorFiles += domainResult.errorFiles;

      if (domainResult.summary.healthy) {
        results.healthyDomains++;
      } else {
        results.unhealthyDomains++;
      }
    }

    // Generate overall summary
    results.summary = {
      overallHealthy: results.unhealthyDomains === 0,
      domainSuccessRate: ((results.healthyDomains / results.totalDomains) * 100).toFixed(2),
      fileSuccessRate:
        results.totalFiles > 0 ? ((results.validFiles / results.totalFiles) * 100).toFixed(2) : '0',
      totalIssues: results.invalidFiles + results.missingFiles + results.errorFiles,
    };

    const overallStatus = results.summary.overallHealthy ? '✅' : '⚠️';
    console.log(`${overallStatus} Overall integrity check completed:`);
    console.log(
      `   Domains: ${results.healthyDomains}/${results.totalDomains} healthy (${results.summary.domainSuccessRate}%)`
    );
    console.log(
      `   Files: ${results.validFiles}/${results.totalFiles} valid (${results.summary.fileSuccessRate}%)`
    );

    if (!results.summary.overallHealthy) {
      console.log(
        `   Total issues: ${results.summary.totalIssues} across ${results.unhealthyDomains} domains`
      );
    }
  } catch (error) {
    console.error(`❌ Integrity check failed: ${error.message}`);
    results.summary.error = error.message;
  }

  return results;
}

/**
 * Get all files in directory recursively
 */
async function getAllFilesRecursive(directory) {
  const files = [];

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await getAllFilesRecursive(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Failed to read directory ${directory}: ${error.message}`);
  }

  return files;
}

/**
 * Create integrity report
 */
async function createIntegrityReport(integrityResult, outputPath = null) {
  const reportPath = outputPath || path.join(config.REPORTS_DIR, 'integrity-report.json');

  const report = {
    ...integrityResult,
    generatedAt: new Date().toISOString(),
    configuration: {
      useCloudStorage: config.USE_CLOUD_STORAGE,
      storageBucket: config.STORAGE_BUCKET,
      reportsDir: config.REPORTS_DIR,
    },
  };

  try {
    // Ensure directory exists for local storage
    if (!config.USE_CLOUD_STORAGE) {
      const dir = path.dirname(reportPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    } else {
      const relativePath = path.relative(config.PUBLIC_DIR, reportPath);
      await storage.saveFile(relativePath, JSON.stringify(report, null, 2), {
        contentType: 'application/json',
      });
    }

    console.log(`📄 Integrity report saved to: ${reportPath}`);
    return reportPath;
  } catch (error) {
    console.error(`❌ Failed to save integrity report: ${error.message}`);
    throw error;
  }
}

module.exports = {
  checkFileIntegrity,
  checkDomainIntegrity,
  checkAllDomainsIntegrity,
  createIntegrityReport,
  calculateHash,
  validateJsonStructure,
  validateHtmlStructure,
  INTEGRITY_STATUS,
};
