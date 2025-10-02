/**
 * Enhanced Cloud Storage Utilities for CATS
 * Provides abstraction layer for local file system and Google Cloud Storage
 * with comprehensive error handling, fallback strategies, and health monitoring
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../core/config');

// Lazy load Google Cloud Storage to avoid errors when not configured
let Storage = null;
let bucket = null;
let storageHealthy = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Storage operation retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

// Storage health status
const STORAGE_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
};

/**
 * Validate cloud storage configuration
 */
function validateCloudStorageConfig() {
  const errors = [];

  if (!config.GOOGLE_CLOUD_PROJECT) {
    errors.push('GOOGLE_CLOUD_PROJECT is required for cloud storage');
  }

  if (!config.STORAGE_BUCKET) {
    errors.push('CATS_STORAGE_BUCKET is required for cloud storage');
  }

  return errors;
}

/**
 * Initialize Google Cloud Storage if enabled
 */
async function initializeCloudStorage() {
  if (config.USE_CLOUD_STORAGE && !bucket) {
    try {
      // Validate configuration first
      const configErrors = validateCloudStorageConfig();
      if (configErrors.length > 0) {
        throw new Error(`Cloud storage configuration errors: ${configErrors.join(', ')}`);
      }

      const { Storage: GCSStorage } = require('@google-cloud/storage');
      Storage = GCSStorage;

      const storage = new Storage({
        projectId: config.GOOGLE_CLOUD_PROJECT,
      });

      bucket = storage.bucket(config.STORAGE_BUCKET);

      // Test bucket connectivity
      await testBucketConnectivity();

      console.log(`✅ Google Cloud Storage initialized: ${config.STORAGE_BUCKET}`);
      storageHealthy = STORAGE_STATUS.HEALTHY;
      lastHealthCheck = Date.now();
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud Storage:', error.message);
      storageHealthy = STORAGE_STATUS.FAILED;
      throw error;
    }
  }
}

/**
 * Test bucket connectivity and permissions
 */
async function testBucketConnectivity() {
  if (!bucket) {
    throw new Error('Bucket not initialized');
  }

  try {
    // Test bucket existence and access
    const [exists] = await bucket.exists();
    if (!exists) {
      throw new Error(`Bucket ${config.STORAGE_BUCKET} does not exist`);
    }

    // Test write permissions by creating a test file
    const testFile = bucket.file('.cats-health-check');
    const testContent = JSON.stringify({
      timestamp: new Date().toISOString(),
      test: 'connectivity-check',
    });

    await testFile.save(testContent, {
      metadata: {
        contentType: 'application/json',
      },
    });

    // Clean up test file
    await testFile.delete();

    console.log(`✅ Bucket connectivity test passed: ${config.STORAGE_BUCKET}`);
    return true;
  } catch (error) {
    console.error(`❌ Bucket connectivity test failed: ${error.message}`);
    throw new Error(`Bucket connectivity test failed: ${error.message}`);
  }
}

/**
 * Check storage health with caching
 */
async function checkStorageHealth() {
  const now = Date.now();

  // Return cached result if recent
  if (storageHealthy !== null && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return storageHealthy;
  }

  if (!config.USE_CLOUD_STORAGE) {
    storageHealthy = STORAGE_STATUS.HEALTHY;
    lastHealthCheck = now;
    return storageHealthy;
  }

  try {
    await initializeCloudStorage();
    await testBucketConnectivity();
    storageHealthy = STORAGE_STATUS.HEALTHY;
  } catch (error) {
    console.warn(`⚠️ Storage health check failed: ${error.message}`);
    storageHealthy = STORAGE_STATUS.FAILED;
  }

  lastHealthCheck = now;
  return storageHealthy;
}

/**
 * Retry operation with exponential backoff
 */
async function retryOperation(operation, operationName, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        console.error(
          `❌ ${operationName} failed after ${maxRetries + 1} attempts:`,
          error.message
        );
        throw error;
      }

      const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, attempt), RETRY_CONFIG.maxDelay);

      console.warn(
        `⚠️ ${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        error.message
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Save file to local storage (fallback method)
 */
async function saveFileLocal(filePath, content, _options = {}) {
  const fullPath = path.join(config.PUBLIC_DIR, filePath);
  const dir = path.dirname(fullPath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, content);
  console.log(`💾 Saved locally: ${fullPath}`);
}

/**
 * Save file to cloud storage with retry logic
 */
async function saveFileCloud(filePath, content, options = {}) {
  await initializeCloudStorage();

  const operation = async () => {
    const file = bucket.file(filePath);
    const stream = file.createWriteStream({
      metadata: {
        contentType: options.contentType || getContentType(filePath),
        cacheControl: options.cacheControl || 'public, max-age=3600',
      },
      resumable: false, // Use simple upload for small files
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Upload timeout'));
      }, 60000); // 60 second timeout

      stream.on('error', error => {
        clearTimeout(timeout);
        reject(error);
      });

      stream.on('finish', () => {
        clearTimeout(timeout);
        console.log(`📤 Uploaded to GCS: ${filePath}`);
        resolve();
      });

      if (typeof content === 'string') {
        stream.end(content);
      } else {
        stream.end(content);
      }
    });
  };

  return retryOperation(operation, `Save file to cloud: ${filePath}`);
}

/**
 * Save file to storage (local or cloud) with fallback
 */
async function saveFile(filePath, content, options = {}) {
  if (config.USE_CLOUD_STORAGE) {
    try {
      // Check storage health first
      const healthStatus = await checkStorageHealth();

      if (healthStatus === STORAGE_STATUS.HEALTHY) {
        await saveFileCloud(filePath, content, options);
        return { location: 'cloud', fallback: false };
      } else {
        console.warn(`⚠️ Cloud storage unhealthy (${healthStatus}), falling back to local storage`);
        throw new Error(`Cloud storage unhealthy: ${healthStatus}`);
      }
    } catch (error) {
      console.error(`❌ Cloud storage failed: ${error.message}`);

      if (options.allowFallback !== false) {
        console.log(`🔄 Falling back to local storage for: ${filePath}`);
        await saveFileLocal(filePath, content, options);
        return { location: 'local', fallback: true, error: error.message };
      } else {
        throw error;
      }
    }
  } else {
    await saveFileLocal(filePath, content, options);
    return { location: 'local', fallback: false };
  }
}

/**
 * Read file from local storage
 */
async function readFileLocal(filePath) {
  const fullPath = path.join(config.PUBLIC_DIR, filePath);
  return await fs.readFile(fullPath, 'utf8');
}

/**
 * Read file from cloud storage with retry logic
 */
async function readFileCloud(filePath) {
  await initializeCloudStorage();

  const operation = async () => {
    const file = bucket.file(filePath);
    const [contents] = await file.download();
    return contents.toString();
  };

  return retryOperation(operation, `Read file from cloud: ${filePath}`);
}

/**
 * Read file from storage (local or cloud) with fallback
 */
async function readFile(filePath) {
  if (config.USE_CLOUD_STORAGE) {
    try {
      const healthStatus = await checkStorageHealth();

      if (healthStatus === STORAGE_STATUS.HEALTHY) {
        return await readFileCloud(filePath);
      } else {
        console.warn(`⚠️ Cloud storage unhealthy (${healthStatus}), trying local fallback`);
        throw new Error(`Cloud storage unhealthy: ${healthStatus}`);
      }
    } catch (error) {
      console.error(`❌ Cloud storage read failed: ${error.message}`);
      console.log(`🔄 Attempting local fallback for: ${filePath}`);

      try {
        return await readFileLocal(filePath);
      } catch {
        throw new Error(`File not found in cloud or local storage: ${filePath}`);
      }
    }
  } else {
    return await readFileLocal(filePath);
  }
}

/**
 * Check if file exists in local storage
 */
async function fileExistsLocal(filePath) {
  const fullPath = path.join(config.PUBLIC_DIR, filePath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file exists in cloud storage
 */
async function fileExistsCloud(filePath) {
  await initializeCloudStorage();

  const operation = async () => {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  };

  return retryOperation(operation, `Check file exists in cloud: ${filePath}`);
}

/**
 * Check if file exists in storage (local or cloud)
 */
async function fileExists(filePath) {
  if (config.USE_CLOUD_STORAGE) {
    try {
      const healthStatus = await checkStorageHealth();

      if (healthStatus === STORAGE_STATUS.HEALTHY) {
        return await fileExistsCloud(filePath);
      } else {
        console.warn(`⚠️ Cloud storage unhealthy (${healthStatus}), checking local fallback`);
        return await fileExistsLocal(filePath);
      }
    } catch (error) {
      console.error(`❌ Cloud storage check failed: ${error.message}`);
      return await fileExistsLocal(filePath);
    }
  } else {
    return await fileExistsLocal(filePath);
  }
}

/**
 * List files in directory (local storage)
 */
async function listFilesLocal(directory = '') {
  const fullPath = path.join(config.PUBLIC_DIR, directory);
  try {
    const files = await fs.readdir(fullPath, { recursive: true });
    return files.filter(file => {
      const filePath = path.join(fullPath, file);
      try {
        return require('fs').statSync(filePath).isFile();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/**
 * List files in directory (cloud storage)
 */
async function listFilesCloud(directory = '') {
  await initializeCloudStorage();

  const operation = async () => {
    const [files] = await bucket.getFiles({
      prefix: directory,
    });

    return files.map(file => file.name);
  };

  return retryOperation(operation, `List files in cloud: ${directory}`);
}

/**
 * List files in directory (local or cloud)
 */
async function listFiles(directory = '') {
  if (config.USE_CLOUD_STORAGE) {
    try {
      const healthStatus = await checkStorageHealth();

      if (healthStatus === STORAGE_STATUS.HEALTHY) {
        return await listFilesCloud(directory);
      } else {
        console.warn(`⚠️ Cloud storage unhealthy (${healthStatus}), listing local files`);
        return await listFilesLocal(directory);
      }
    } catch (error) {
      console.error(`❌ Cloud storage list failed: ${error.message}`);
      return await listFilesLocal(directory);
    }
  } else {
    return await listFilesLocal(directory);
  }
}

/**
 * Get public URL for a file
 */
function getPublicUrl(filePath) {
  if (config.USE_CLOUD_STORAGE) {
    // Use Google Cloud Storage public URL
    return `https://storage.googleapis.com/${config.STORAGE_BUCKET}/${filePath}`;
  } else {
    // Local development URL
    const baseUrl = process.env.BASE_URL || `http://${config.SERVER_HOST}:${config.SERVER_PORT}`;
    return `${baseUrl}/${filePath}`;
  }
}

/**
 * Delete file from local storage
 */
async function deleteFileLocal(filePath) {
  const fullPath = path.join(config.PUBLIC_DIR, filePath);
  try {
    await fs.unlink(fullPath);
    console.log(`🗑️ Deleted locally: ${fullPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Delete file from cloud storage
 */
async function deleteFileCloud(filePath) {
  await initializeCloudStorage();

  const operation = async () => {
    const file = bucket.file(filePath);
    await file.delete();
    console.log(`🗑️ Deleted from GCS: ${filePath}`);
  };

  return retryOperation(operation, `Delete file from cloud: ${filePath}`);
}

/**
 * Delete file from storage (local or cloud)
 */
async function deleteFile(filePath) {
  if (config.USE_CLOUD_STORAGE) {
    try {
      const healthStatus = await checkStorageHealth();

      if (healthStatus === STORAGE_STATUS.HEALTHY) {
        await deleteFileCloud(filePath);
      } else {
        console.warn(`⚠️ Cloud storage unhealthy (${healthStatus}), deleting from local fallback`);
        await deleteFileLocal(filePath);
      }
    } catch (error) {
      console.error(`❌ Cloud storage delete failed: ${error.message}`);
      console.log(`🔄 Attempting local deletion for: ${filePath}`);
      await deleteFileLocal(filePath);
    }
  } else {
    await deleteFileLocal(filePath);
  }
}

/**
 * Copy static assets to cloud storage (for deployment)
 */
async function uploadStaticAssets() {
  if (!config.USE_CLOUD_STORAGE) {
    console.log('🔄 Skipping static asset upload (local storage mode)');
    return { uploaded: 0, skipped: 0, errors: [] };
  }

  try {
    await initializeCloudStorage();

    const assetsToUpload = [
      { local: 'public/styles', remote: 'styles' },
      { local: 'public/scripts', remote: 'scripts' },
    ];

    let uploadedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const asset of assetsToUpload) {
      try {
        const localPath = path.join(config.ROOT_DIR, asset.local);

        // Check if directory exists
        try {
          await fs.access(localPath);
        } catch {
          console.log(`🔄 Skipping non-existent directory: ${asset.local}`);
          skippedCount++;
          continue;
        }

        const files = await fs.readdir(localPath, { recursive: true });

        for (const file of files) {
          const localFilePath = path.join(localPath, file);
          const stat = await fs.stat(localFilePath);

          if (stat.isFile()) {
            try {
              const content = await fs.readFile(localFilePath);
              const remotePath = `${asset.remote}/${file}`;

              const operation = async () => {
                const gcsFile = bucket.file(remotePath);
                await gcsFile.save(content, {
                  metadata: {
                    contentType: getContentType(file),
                    cacheControl: 'public, max-age=86400', // 24 hours cache
                  },
                });
              };

              await retryOperation(operation, `Upload asset: ${remotePath}`);
              console.log(`📤 Uploaded asset: ${remotePath}`);
              uploadedCount++;
            } catch (error) {
              const errorMsg = `Failed to upload ${asset.remote}/${file}: ${error.message}`;
              console.error(`❌ ${errorMsg}`);
              errors.push(errorMsg);
            }
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process ${asset.local}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const result = { uploaded: uploadedCount, skipped: skippedCount, errors };
    console.log(
      `✅ Asset upload complete: ${uploadedCount} uploaded, ${skippedCount} skipped, ${errors.length} errors`
    );

    return result;
  } catch (error) {
    console.error(`❌ Static asset upload failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Get storage health status
 */
async function getStorageHealth() {
  try {
    const health = await checkStorageHealth();
    return {
      status: health,
      lastCheck: new Date(lastHealthCheck).toISOString(),
      storageType: config.USE_CLOUD_STORAGE ? 'cloud' : 'local',
      bucket: config.USE_CLOUD_STORAGE ? config.STORAGE_BUCKET : null,
    };
  } catch (error) {
    return {
      status: STORAGE_STATUS.FAILED,
      error: error.message,
      storageType: config.USE_CLOUD_STORAGE ? 'cloud' : 'local',
    };
  }
}

/**
 * Force storage health check (bypass cache)
 */
async function forceHealthCheck() {
  lastHealthCheck = 0;
  storageHealthy = null;
  return await checkStorageHealth();
}

module.exports = {
  saveFile,
  readFile,
  fileExists,
  listFiles,
  getPublicUrl,
  deleteFile,
  uploadStaticAssets,
  initializeCloudStorage,
  checkStorageHealth,
  getStorageHealth,
  forceHealthCheck,
  testBucketConnectivity,
  validateCloudStorageConfig,
  STORAGE_STATUS,
};
