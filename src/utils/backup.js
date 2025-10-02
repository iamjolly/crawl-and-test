/**
 * Backup and Restore Utilities for CATS
 * Provides comprehensive backup and restoration capabilities
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../core/config');
const storage = require('./storage');

/**
 * Backup status tracking
 */
const BACKUP_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial',
};

/**
 * Generate backup metadata
 */
function generateBackupMetadata(type, scope) {
  return {
    id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type, // 'reports', 'full', 'domain'
    scope, // domain name or 'all'
    timestamp: new Date().toISOString(),
    version: '1.0',
    source: config.USE_CLOUD_STORAGE ? 'cloud' : 'local',
  };
}

/**
 * Create backup of all reports
 */
async function createFullBackup(options = {}) {
  const {
    outputDir = path.join(config.ROOT_DIR, 'backups'),
    compress = true,
    includeConfig = true,
    verbose = false,
  } = options;

  const metadata = generateBackupMetadata('full', 'all');
  const backupDir = path.join(outputDir, metadata.id);

  console.log(`🔄 Creating full backup: ${metadata.id}`);

  try {
    // Create backup directory
    await fs.mkdir(backupDir, { recursive: true });

    const backupResult = {
      ...metadata,
      status: BACKUP_STATUS.IN_PROGRESS,
      files: [],
      totalSize: 0,
      errors: [],
    };

    // Backup reports
    if (config.USE_CLOUD_STORAGE) {
      await backupFromCloudStorage(backupDir, backupResult, { verbose });
    } else {
      await backupFromLocalStorage(backupDir, backupResult, { verbose });
    }

    // Backup configuration if requested
    if (includeConfig) {
      await backupConfiguration(backupDir, backupResult, { verbose });
    }

    // Create manifest file
    const manifestPath = path.join(backupDir, 'backup-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(backupResult, null, 2));

    // Compress if requested
    if (compress) {
      // Note: In a real implementation, you might use a compression library like tar or zip
      console.log(`📦 Compression not implemented yet - backup saved to: ${backupDir}`);
    }

    backupResult.status =
      backupResult.errors.length > 0 ? BACKUP_STATUS.PARTIAL : BACKUP_STATUS.COMPLETED;
    backupResult.backupPath = backupDir;
    backupResult.completedAt = new Date().toISOString();

    console.log(
      `✅ Backup completed: ${backupResult.files.length} files, ${formatBytes(backupResult.totalSize)}`
    );

    if (backupResult.errors.length > 0) {
      console.warn(`⚠️  ${backupResult.errors.length} errors during backup`);
    }

    return backupResult;
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Backup from cloud storage
 */
async function backupFromCloudStorage(backupDir, backupResult, options = {}) {
  const { verbose = false } = options;

  try {
    // Get all files from cloud storage
    const files = await storage.listFiles('reports/');

    for (const filePath of files) {
      try {
        if (verbose) {
          console.log(`📥 Downloading: ${filePath}`);
        }

        const content = await storage.readFile(filePath);
        const localPath = path.join(backupDir, filePath);
        const localDir = path.dirname(localPath);

        // Ensure directory exists
        await fs.mkdir(localDir, { recursive: true });

        // Write file to backup directory
        await fs.writeFile(localPath, content);

        const stats = await fs.stat(localPath);
        backupResult.files.push({
          originalPath: filePath,
          backupPath: localPath,
          size: stats.size,
          timestamp: new Date().toISOString(),
        });

        backupResult.totalSize += stats.size;
      } catch (error) {
        const errorMsg = `Failed to backup ${filePath}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        backupResult.errors.push(errorMsg);
      }
    }
  } catch (error) {
    throw new Error(`Failed to list cloud storage files: ${error.message}`);
  }
}

/**
 * Backup from local storage
 */
async function backupFromLocalStorage(backupDir, backupResult, options = {}) {
  const { verbose = false } = options;

  const sourceDir = config.REPORTS_DIR;

  try {
    await copyDirectoryRecursive(sourceDir, path.join(backupDir, 'reports'), backupResult, {
      verbose,
    });
  } catch (error) {
    throw new Error(`Failed to backup local storage: ${error.message}`);
  }
}

/**
 * Copy directory recursively
 */
async function copyDirectoryRecursive(src, dest, backupResult, options = {}) {
  const { verbose = false } = options;

  try {
    await fs.mkdir(dest, { recursive: true });

    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectoryRecursive(srcPath, destPath, backupResult, options);
      } else if (entry.isFile()) {
        if (verbose) {
          console.log(`📁 Copying: ${srcPath}`);
        }

        await fs.copyFile(srcPath, destPath);

        const stats = await fs.stat(destPath);
        backupResult.files.push({
          originalPath: srcPath,
          backupPath: destPath,
          size: stats.size,
          timestamp: new Date().toISOString(),
        });

        backupResult.totalSize += stats.size;
      }
    }
  } catch (error) {
    const errorMsg = `Failed to copy ${src}: ${error.message}`;
    console.error(`❌ ${errorMsg}`);
    backupResult.errors.push(errorMsg);
  }
}

/**
 * Backup configuration files
 */
async function backupConfiguration(backupDir, backupResult, options = {}) {
  const { verbose = false } = options;

  const configFiles = [
    { src: '.env', name: 'environment-config.env' },
    { src: 'package.json', name: 'package.json' },
    { src: 'src/core/config.js', name: 'config.js' },
  ];

  const configBackupDir = path.join(backupDir, 'config');
  await fs.mkdir(configBackupDir, { recursive: true });

  for (const configFile of configFiles) {
    try {
      const srcPath = path.join(config.ROOT_DIR, configFile.src);
      const destPath = path.join(configBackupDir, configFile.name);

      // Check if file exists
      try {
        await fs.access(srcPath);
      } catch {
        if (verbose) {
          console.log(`⏭️  Skipping missing config file: ${configFile.src}`);
        }
        continue;
      }

      if (verbose) {
        console.log(`⚙️  Backing up config: ${configFile.src}`);
      }

      await fs.copyFile(srcPath, destPath);

      const stats = await fs.stat(destPath);
      backupResult.files.push({
        originalPath: srcPath,
        backupPath: destPath,
        size: stats.size,
        type: 'config',
        timestamp: new Date().toISOString(),
      });

      backupResult.totalSize += stats.size;
    } catch (error) {
      const errorMsg = `Failed to backup config ${configFile.src}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      backupResult.errors.push(errorMsg);
    }
  }
}

/**
 * Create backup of specific domain
 */
async function createDomainBackup(domain, options = {}) {
  const { outputDir = path.join(config.ROOT_DIR, 'backups'), verbose = false } = options;

  const metadata = generateBackupMetadata('domain', domain);
  const backupDir = path.join(outputDir, metadata.id);

  console.log(`🔄 Creating domain backup for: ${domain}`);

  try {
    await fs.mkdir(backupDir, { recursive: true });

    const backupResult = {
      ...metadata,
      status: BACKUP_STATUS.IN_PROGRESS,
      files: [],
      totalSize: 0,
      errors: [],
    };

    if (config.USE_CLOUD_STORAGE) {
      // Backup specific domain from cloud
      const domainFiles = await storage.listFiles(`reports/${domain}/`);

      for (const filePath of domainFiles) {
        try {
          if (verbose) {
            console.log(`📥 Downloading: ${filePath}`);
          }

          const content = await storage.readFile(filePath);
          const localPath = path.join(backupDir, filePath);
          const localDir = path.dirname(localPath);

          await fs.mkdir(localDir, { recursive: true });
          await fs.writeFile(localPath, content);

          const stats = await fs.stat(localPath);
          backupResult.files.push({
            originalPath: filePath,
            backupPath: localPath,
            size: stats.size,
            timestamp: new Date().toISOString(),
          });

          backupResult.totalSize += stats.size;
        } catch (error) {
          const errorMsg = `Failed to backup ${filePath}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          backupResult.errors.push(errorMsg);
        }
      }
    } else {
      // Backup specific domain from local storage
      const domainDir = path.join(config.REPORTS_DIR, domain);
      const targetDir = path.join(backupDir, 'reports', domain);

      await copyDirectoryRecursive(domainDir, targetDir, backupResult, { verbose });
    }

    // Create manifest
    const manifestPath = path.join(backupDir, 'backup-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(backupResult, null, 2));

    backupResult.status =
      backupResult.errors.length > 0 ? BACKUP_STATUS.PARTIAL : BACKUP_STATUS.COMPLETED;
    backupResult.backupPath = backupDir;
    backupResult.completedAt = new Date().toISOString();

    console.log(
      `✅ Domain backup completed: ${backupResult.files.length} files, ${formatBytes(backupResult.totalSize)}`
    );

    return backupResult;
  } catch (error) {
    console.error(`❌ Domain backup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Restore from backup
 */
async function restoreFromBackup(backupPath, options = {}) {
  const {
    dryRun = false,
    overwrite = false,
    verbose = false,
    targetStorage = null, // 'local', 'cloud', or null for current config
  } = options;

  console.log(`🔄 ${dryRun ? 'Simulating' : 'Starting'} restore from: ${backupPath}`);

  try {
    // Read backup manifest
    const manifestPath = path.join(backupPath, 'backup-manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

    console.log(`📄 Backup info: ${manifest.type} backup from ${manifest.timestamp}`);
    console.log(`📊 Contains ${manifest.files.length} files (${formatBytes(manifest.totalSize)})`);

    if (dryRun) {
      console.log(`🔍 DRY RUN - would restore ${manifest.files.length} files`);
      return {
        dryRun: true,
        manifest,
        wouldRestore: manifest.files.length,
      };
    }

    const useCloudStorage =
      targetStorage === 'cloud' || (targetStorage === null && config.USE_CLOUD_STORAGE);

    const restoreResult = {
      manifest,
      targetStorage: useCloudStorage ? 'cloud' : 'local',
      restored: 0,
      skipped: 0,
      errors: [],
      startTime: new Date().toISOString(),
    };

    // Restore files
    for (const fileInfo of manifest.files) {
      if (fileInfo.type === 'config') {
        if (verbose) {
          console.log(`⏭️  Skipping config file: ${fileInfo.originalPath}`);
        }
        restoreResult.skipped++;
        continue;
      }

      try {
        const backupFilePath = fileInfo.backupPath;
        const relativePath = path.relative(path.join(backupPath, 'reports'), backupFilePath);

        // Check if file already exists
        const exists = useCloudStorage
          ? await storage.fileExists(`reports/${relativePath}`)
          : await fs
              .access(path.join(config.REPORTS_DIR, relativePath))
              .then(() => true)
              .catch(() => false);

        if (exists && !overwrite) {
          if (verbose) {
            console.log(`⏭️  Skipping existing file: ${relativePath}`);
          }
          restoreResult.skipped++;
          continue;
        }

        if (verbose) {
          console.log(`📤 Restoring: ${relativePath}`);
        }

        const content = await fs.readFile(backupFilePath);

        if (useCloudStorage) {
          await storage.saveFile(`reports/${relativePath}`, content, {
            allowFallback: false,
          });
        } else {
          const localPath = path.join(config.REPORTS_DIR, relativePath);
          const localDir = path.dirname(localPath);
          await fs.mkdir(localDir, { recursive: true });
          await fs.writeFile(localPath, content);
        }

        restoreResult.restored++;
      } catch (error) {
        const errorMsg = `Failed to restore ${fileInfo.originalPath}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        restoreResult.errors.push(errorMsg);
      }
    }

    restoreResult.completedAt = new Date().toISOString();

    console.log(
      `✅ Restore completed: ${restoreResult.restored} restored, ${restoreResult.skipped} skipped, ${restoreResult.errors.length} errors`
    );

    if (restoreResult.errors.length > 0) {
      console.warn(`⚠️  ${restoreResult.errors.length} files failed to restore`);
    }

    return restoreResult;
  } catch (error) {
    console.error(`❌ Restore failed: ${error.message}`);
    throw error;
  }
}

/**
 * List available backups
 */
async function listBackups(backupDir = path.join(config.ROOT_DIR, 'backups')) {
  try {
    const entries = await fs.readdir(backupDir, { withFileTypes: true });
    const backups = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const manifestPath = path.join(backupDir, entry.name, 'backup-manifest.json');
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

          backups.push({
            id: entry.name,
            ...manifest,
            path: path.join(backupDir, entry.name),
          });
        } catch {
          // Skip directories without valid manifests
        }
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return backups;
  } catch (error) {
    console.error(`❌ Failed to list backups: ${error.message}`);
    return [];
  }
}

/**
 * Format bytes in human readable format
 */
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = {
  createFullBackup,
  createDomainBackup,
  restoreFromBackup,
  listBackups,
  BACKUP_STATUS,
};
