#!/usr/bin/env node

/**
 * CATS Storage Management CLI
 * Command-line interface for storage persistence, migration, backup, and integrity checking
 */

const { Command } = require('commander');
const config = require('../core/config');
const storage = require('./storage');
const migration = require('./migration');
const backup = require('./backup');
const integrity = require('./integrity');

const program = new Command();

program.name('cats-storage').description('CATS Storage Management CLI').version('1.0.0');

// Storage health commands
const healthCmd = program.command('health').description('Check storage health and connectivity');

healthCmd
  .command('check')
  .description('Check current storage health')
  .option('-f, --force', 'Force fresh health check (bypass cache)')
  .action(async options => {
    try {
      console.log('🔍 Checking storage health...');

      const health = options.force
        ? await storage.forceHealthCheck()
        : await storage.getStorageHealth();

      console.log('📊 Storage Health Status:');
      console.log(JSON.stringify(health, null, 2));

      if (health.status === storage.STORAGE_STATUS.HEALTHY) {
        console.log('✅ Storage is healthy');
        process.exit(0);
      } else {
        console.log('❌ Storage has issues');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  });

healthCmd
  .command('test')
  .description('Test storage connectivity and permissions')
  .action(async () => {
    try {
      console.log('🧪 Testing storage connectivity...');

      if (!config.USE_CLOUD_STORAGE) {
        console.log('📁 Local storage mode - testing file operations');

        // Test local storage
        const testFile = 'test-connectivity.txt';
        const testContent = `Storage test - ${new Date().toISOString()}`;

        await storage.saveFile(testFile, testContent);
        const readContent = await storage.readFile(testFile);

        if (readContent === testContent) {
          console.log('✅ Local storage test passed');
        } else {
          throw new Error('Content mismatch in local storage test');
        }

        await storage.deleteFile(testFile);
        console.log('🧹 Cleanup completed');
      } else {
        console.log('☁️  Cloud storage mode - testing GCS connectivity');
        await storage.testBucketConnectivity();
        console.log('✅ Cloud storage test passed');
      }
    } catch (error) {
      console.error('❌ Storage test failed:', error.message);
      process.exit(1);
    }
  });

// Migration commands
const migrateCmd = program
  .command('migrate')
  .description('Data migration between local and cloud storage');

migrateCmd
  .command('domain <domain>')
  .description('Migrate a specific domain to cloud storage')
  .option('-d, --dry-run', 'Simulate migration without making changes')
  .option('-v, --verbose', 'Verbose output')
  .action(async (domain, options) => {
    try {
      const result = await migration.migrateDomain(domain, options);

      if (options.dryRun) {
        console.log('🔍 Migration simulation completed');
      } else {
        console.log('🎉 Migration completed');
      }

      console.log(JSON.stringify(result, null, 2));

      if (result.status === migration.MIGRATION_STATUS.FAILED) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  });

migrateCmd
  .command('all')
  .description('Migrate all domains to cloud storage')
  .option('-d, --dry-run', 'Simulate migration without making changes')
  .option('-v, --verbose', 'Verbose output')
  .option('--domains <domains>', 'Comma-separated list of specific domains to migrate')
  .action(async options => {
    try {
      const migrationOptions = { ...options };

      if (options.domains) {
        migrationOptions.domains = options.domains.split(',').map(d => d.trim());
      }

      const result = await migration.migrateAllDomains(migrationOptions);

      if (options.dryRun) {
        console.log('🔍 Migration simulation completed');
      } else {
        console.log('🎉 Migration completed');
      }

      // Save migration report
      if (!options.dryRun) {
        await migration.createMigrationReport(result);
      }

      if (result.status === migration.MIGRATION_STATUS.FAILED) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  });

migrateCmd
  .command('verify [domain]')
  .description('Verify migration by comparing local and cloud files')
  .action(async domain => {
    try {
      console.log('🔍 Verifying migration...');
      const result = await migration.verifyMigration(domain);

      console.log('📊 Migration Verification Results:');
      result.domains.forEach(domainResult => {
        const status = domainResult.missing === 0 && domainResult.errors.length === 0 ? '✅' : '❌';
        console.log(
          `${status} ${domainResult.domain}: ${domainResult.verified}/${domainResult.localFiles} verified`
        );

        if (domainResult.errors.length > 0) {
          domainResult.errors.forEach(error => console.log(`   ⚠️  ${error}`));
        }
      });
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      process.exit(1);
    }
  });

// Backup commands
const backupCmd = program.command('backup').description('Create and manage backups');

backupCmd
  .command('create')
  .description('Create a full backup of all reports')
  .option('-o, --output <dir>', 'Output directory for backup')
  .option('--no-compress', 'Skip compression')
  .option('--no-config', 'Exclude configuration files')
  .option('-v, --verbose', 'Verbose output')
  .action(async options => {
    try {
      console.log('🔄 Creating full backup...');

      const backupOptions = {
        outputDir: options.output,
        compress: options.compress !== false,
        includeConfig: options.config !== false,
        verbose: options.verbose,
      };

      const result = await backup.createFullBackup(backupOptions);

      console.log('✅ Backup completed:');
      console.log(`   ID: ${result.id}`);
      console.log(`   Files: ${result.files.length}`);
      console.log(`   Size: ${formatBytes(result.totalSize)}`);
      console.log(`   Location: ${result.backupPath}`);

      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.length}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      process.exit(1);
    }
  });

backupCmd
  .command('create-domain <domain>')
  .description('Create backup of a specific domain')
  .option('-o, --output <dir>', 'Output directory for backup')
  .option('-v, --verbose', 'Verbose output')
  .action(async (domain, options) => {
    try {
      console.log(`🔄 Creating backup for domain: ${domain}...`);

      const result = await backup.createDomainBackup(domain, options);

      console.log('✅ Domain backup completed:');
      console.log(`   ID: ${result.id}`);
      console.log(`   Files: ${result.files.length}`);
      console.log(`   Size: ${formatBytes(result.totalSize)}`);
      console.log(`   Location: ${result.backupPath}`);
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      process.exit(1);
    }
  });

backupCmd
  .command('list')
  .description('List available backups')
  .option('-d, --dir <dir>', 'Backup directory to search')
  .action(async options => {
    try {
      const backups = await backup.listBackups(options.dir);

      if (backups.length === 0) {
        console.log('📭 No backups found');
        return;
      }

      console.log(`📋 Found ${backups.length} backups:`);
      console.log('');

      backups.forEach(backup => {
        const date = new Date(backup.timestamp).toLocaleString();
        const size = formatBytes(backup.totalSize || 0);

        console.log(`🗂️  ${backup.id}`);
        console.log(`   Type: ${backup.type} (${backup.scope})`);
        console.log(`   Date: ${date}`);
        console.log(`   Files: ${backup.files?.length || 0}`);
        console.log(`   Size: ${size}`);
        console.log(`   Status: ${backup.status}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message);
      process.exit(1);
    }
  });

backupCmd
  .command('restore <backup-path>')
  .description('Restore from backup')
  .option('-d, --dry-run', 'Simulate restore without making changes')
  .option('--overwrite', 'Overwrite existing files')
  .option('-v, --verbose', 'Verbose output')
  .option('--target <storage>', 'Target storage: local, cloud, or auto')
  .action(async (backupPath, options) => {
    try {
      console.log(`🔄 ${options.dryRun ? 'Simulating' : 'Starting'} restore from: ${backupPath}`);

      const restoreOptions = {
        dryRun: options.dryRun,
        overwrite: options.overwrite,
        verbose: options.verbose,
        targetStorage: options.target,
      };

      const result = await backup.restoreFromBackup(backupPath, restoreOptions);

      if (options.dryRun) {
        console.log(`🔍 Would restore ${result.wouldRestore} files`);
      } else {
        console.log('✅ Restore completed:');
        console.log(`   Restored: ${result.restored}`);
        console.log(`   Skipped: ${result.skipped}`);
        console.log(`   Errors: ${result.errors.length}`);

        if (result.errors.length > 0) {
          console.log('❌ Restore completed with errors');
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      process.exit(1);
    }
  });

// Integrity commands
const integrityCmd = program.command('integrity').description('Check data integrity');

integrityCmd
  .command('check [domain]')
  .description('Check integrity of files (all domains or specific domain)')
  .option('-v, --verbose', 'Verbose output')
  .option('--details', 'Include detailed file information')
  .option('-r, --report <path>', 'Save report to specified path')
  .action(async (domain, options) => {
    try {
      console.log(
        `🔍 Checking integrity${domain ? ` for domain: ${domain}` : ' for all domains'}...`
      );

      const checkOptions = {
        verbose: options.verbose,
        includeDetails: options.details,
      };

      const result = domain
        ? await integrity.checkDomainIntegrity(domain, checkOptions)
        : await integrity.checkAllDomainsIntegrity(checkOptions);

      // Save report if requested
      if (options.report) {
        await integrity.createIntegrityReport(result, options.report);
      }

      // Exit with error code if issues found
      if (domain) {
        if (!result.summary.healthy) {
          process.exit(1);
        }
      } else {
        if (!result.summary.overallHealthy) {
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('❌ Integrity check failed:', error.message);
      process.exit(1);
    }
  });

integrityCmd
  .command('file <file-path>')
  .description('Check integrity of a specific file')
  .option('--hash <expected-hash>', 'Expected SHA-256 hash for validation')
  .action(async (filePath, options) => {
    try {
      console.log(`🔍 Checking file integrity: ${filePath}`);

      const checkOptions = {
        expectedHash: options.hash,
      };

      const result = await integrity.checkFileIntegrity(filePath, checkOptions);

      console.log('📊 File Integrity Result:');
      console.log(JSON.stringify(result, null, 2));

      if (result.status !== integrity.INTEGRITY_STATUS.VALID) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ File integrity check failed:', error.message);
      process.exit(1);
    }
  });

// Utility function
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

// Error handling
process.on('unhandledRejection', error => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  program.parse();
}

module.exports = program;
