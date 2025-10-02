/**
 * Data Migration Utilities for CATS
 * Provides tools for migrating data between local and cloud storage
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../core/config');
const storage = require('./storage');

/**
 * Migration status tracking
 */
const MIGRATION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial',
};

/**
 * Get all report directories from local storage
 */
async function getLocalReportDirectories() {
  try {
    const reportsDir = config.REPORTS_DIR;
    const entries = await fs.readdir(reportsDir, { withFileTypes: true });

    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  } catch (error) {
    console.error(`❌ Failed to read local reports directory: ${error.message}`);
    return [];
  }
}

/**
 * Get all files in a directory recursively
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
 * Get relative path from reports directory
 */
function getRelativePath(fullPath) {
  return path.relative(config.PUBLIC_DIR, fullPath);
}

/**
 * Migrate a single file from local to cloud storage
 */
async function migrateFile(localPath, options = {}) {
  try {
    const relativePath = getRelativePath(localPath);
    const content = await fs.readFile(localPath);

    // Determine content type based on file extension
    const contentType = storage.getContentType
      ? storage.getContentType(localPath)
      : 'application/octet-stream';

    const result = await storage.saveFile(relativePath, content, {
      contentType,
      allowFallback: false, // Don't fallback to local during migration
      ...options,
    });

    return {
      success: true,
      localPath,
      remotePath: relativePath,
      size: content.length,
      contentType,
      result,
    };
  } catch (error) {
    return {
      success: false,
      localPath,
      error: error.message,
    };
  }
}

/**
 * Migrate reports for a specific domain
 */
async function migrateDomain(domain, options = {}) {
  const { dryRun = false, verbose = false } = options;

  console.log(`🚀 ${dryRun ? 'Simulating' : 'Starting'} migration for domain: ${domain}`);

  const domainDir = path.join(config.REPORTS_DIR, domain);

  try {
    // Check if domain directory exists
    await fs.access(domainDir);
  } catch {
    return {
      domain,
      status: MIGRATION_STATUS.FAILED,
      error: 'Domain directory does not exist',
      files: [],
    };
  }

  // Get all files in domain directory
  const allFiles = await getAllFilesRecursive(domainDir);

  if (allFiles.length === 0) {
    return {
      domain,
      status: MIGRATION_STATUS.COMPLETED,
      message: 'No files to migrate',
      files: [],
    };
  }

  const results = [];
  let successCount = 0;
  let failureCount = 0;

  for (const filePath of allFiles) {
    if (verbose) {
      console.log(`📁 Processing: ${getRelativePath(filePath)}`);
    }

    if (dryRun) {
      results.push({
        localPath: filePath,
        remotePath: getRelativePath(filePath),
        action: 'would_migrate',
      });
      successCount++;
    } else {
      const result = await migrateFile(filePath, options);
      results.push(result);

      if (result.success) {
        successCount++;
        if (verbose) {
          console.log(`✅ Migrated: ${result.remotePath}`);
        }
      } else {
        failureCount++;
        console.error(`❌ Failed to migrate ${result.localPath}: ${result.error}`);
      }
    }
  }

  const status = dryRun
    ? MIGRATION_STATUS.NOT_STARTED
    : failureCount === 0
      ? MIGRATION_STATUS.COMPLETED
      : successCount > 0
        ? MIGRATION_STATUS.PARTIAL
        : MIGRATION_STATUS.FAILED;

  const summary = {
    domain,
    status,
    totalFiles: allFiles.length,
    successful: successCount,
    failed: failureCount,
    files: results,
    dryRun,
  };

  console.log(
    `${dryRun ? '🔍' : '✅'} Migration ${dryRun ? 'simulation' : 'completed'} for ${domain}: ${successCount}/${allFiles.length} files ${dryRun ? 'would be migrated' : 'successful'}`
  );

  return summary;
}

/**
 * Migrate all domains from local to cloud storage
 */
async function migrateAllDomains(options = {}) {
  const { dryRun = false, verbose = false, domains = null } = options;

  console.log(`🚀 ${dryRun ? 'Simulating' : 'Starting'} migration of all domains to cloud storage`);

  // Check if cloud storage is enabled
  if (!config.USE_CLOUD_STORAGE) {
    throw new Error('Cloud storage is not enabled. Set CATS_USE_CLOUD_STORAGE=true');
  }

  // Test cloud storage connectivity
  if (!dryRun) {
    try {
      await storage.checkStorageHealth();
      console.log('✅ Cloud storage connectivity verified');
    } catch (error) {
      throw new Error(`Cloud storage not accessible: ${error.message}`);
    }
  }

  // Get list of domains to migrate
  const domainsToMigrate = domains || (await getLocalReportDirectories());

  if (domainsToMigrate.length === 0) {
    return {
      status: MIGRATION_STATUS.COMPLETED,
      message: 'No domains found to migrate',
      domains: [],
    };
  }

  console.log(
    `📊 Found ${domainsToMigrate.length} domains to migrate: ${domainsToMigrate.join(', ')}`
  );

  const domainResults = [];
  let totalFiles = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;

  for (const domain of domainsToMigrate) {
    const result = await migrateDomain(domain, { dryRun, verbose });
    domainResults.push(result);

    totalFiles += result.totalFiles || 0;
    totalSuccessful += result.successful || 0;
    totalFailed += result.failed || 0;
  }

  const overallStatus = dryRun
    ? MIGRATION_STATUS.NOT_STARTED
    : totalFailed === 0
      ? MIGRATION_STATUS.COMPLETED
      : totalSuccessful > 0
        ? MIGRATION_STATUS.PARTIAL
        : MIGRATION_STATUS.FAILED;

  const summary = {
    status: overallStatus,
    totalDomains: domainsToMigrate.length,
    totalFiles,
    totalSuccessful,
    totalFailed,
    domains: domainResults,
    dryRun,
    timestamp: new Date().toISOString(),
  };

  console.log(`${dryRun ? '🔍' : '🎉'} Overall migration ${dryRun ? 'simulation' : 'completed'}:`);
  console.log(`   Domains: ${domainsToMigrate.length}`);
  console.log(
    `   Files: ${totalSuccessful}/${totalFiles} ${dryRun ? 'would be migrated' : 'successful'}`
  );

  if (totalFailed > 0 && !dryRun) {
    console.warn(`⚠️  ${totalFailed} files failed to migrate`);
  }

  return summary;
}

/**
 * Verify migration by comparing local and cloud files
 */
async function verifyMigration(domain = null) {
  console.log(`🔍 Verifying migration${domain ? ` for domain: ${domain}` : ' for all domains'}`);

  if (!config.USE_CLOUD_STORAGE) {
    throw new Error('Cloud storage is not enabled');
  }

  const domainsToVerify = domain ? [domain] : await getLocalReportDirectories();
  const verificationResults = [];

  for (const domainName of domainsToVerify) {
    const domainDir = path.join(config.REPORTS_DIR, domainName);
    const localFiles = await getAllFilesRecursive(domainDir);

    const domainResult = {
      domain: domainName,
      localFiles: localFiles.length,
      verified: 0,
      missing: 0,
      errors: [],
    };

    for (const localPath of localFiles) {
      const relativePath = getRelativePath(localPath);

      try {
        const exists = await storage.fileExists(relativePath);
        if (exists) {
          domainResult.verified++;
        } else {
          domainResult.missing++;
          domainResult.errors.push(`Missing in cloud: ${relativePath}`);
        }
      } catch (error) {
        domainResult.errors.push(`Error checking ${relativePath}: ${error.message}`);
      }
    }

    verificationResults.push(domainResult);

    const status = domainResult.missing === 0 && domainResult.errors.length === 0 ? '✅' : '⚠️';
    console.log(
      `${status} ${domainName}: ${domainResult.verified}/${domainResult.localFiles} files verified`
    );
  }

  return {
    domains: verificationResults,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a migration report
 */
async function createMigrationReport(migrationResult, outputPath = null) {
  const reportPath = outputPath || path.join(config.REPORTS_DIR, 'migration-report.json');

  const report = {
    ...migrationResult,
    generatedAt: new Date().toISOString(),
    configuration: {
      useCloudStorage: config.USE_CLOUD_STORAGE,
      storageBucket: config.STORAGE_BUCKET,
      reportsDir: config.REPORTS_DIR,
    },
  };

  try {
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Migration report saved to: ${reportPath}`);
    return reportPath;
  } catch (error) {
    console.error(`❌ Failed to save migration report: ${error.message}`);
    throw error;
  }
}

module.exports = {
  migrateFile,
  migrateDomain,
  migrateAllDomains,
  verifyMigration,
  createMigrationReport,
  getLocalReportDirectories,
  MIGRATION_STATUS,
};
