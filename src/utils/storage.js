/**
 * Cloud Storage Utilities for CATS
 * Provides abstraction layer for local file system and Google Cloud Storage
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../core/config');

// Lazy load Google Cloud Storage to avoid errors when not configured
let Storage = null;
let bucket = null;

/**
 * Initialize Google Cloud Storage if enabled
 */
async function initializeCloudStorage() {
  if (config.USE_CLOUD_STORAGE && !bucket) {
    try {
      const { Storage: GCSStorage } = require('@google-cloud/storage');
      Storage = GCSStorage;

      const storage = new Storage({
        projectId: config.GOOGLE_CLOUD_PROJECT,
      });

      bucket = storage.bucket(config.STORAGE_BUCKET);
      console.log(`✅ Google Cloud Storage initialized: ${config.STORAGE_BUCKET}`);
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud Storage:', error.message);
      throw error;
    }
  }
}

/**
 * Save file to storage (local or cloud)
 */
async function saveFile(filePath, content, options = {}) {
  if (config.USE_CLOUD_STORAGE) {
    await initializeCloudStorage();

    const file = bucket.file(filePath);
    const stream = file.createWriteStream({
      metadata: {
        contentType: options.contentType || 'application/octet-stream',
      },
    });

    return new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', () => {
        console.log(`📤 Uploaded to GCS: ${filePath}`);
        resolve();
      });

      if (typeof content === 'string') {
        stream.end(content);
      } else {
        stream.end(content);
      }
    });
  } else {
    // Local file system
    const fullPath = path.join(config.PUBLIC_DIR, filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
    console.log(`💾 Saved locally: ${fullPath}`);
  }
}

/**
 * Read file from storage (local or cloud)
 */
async function readFile(filePath) {
  if (config.USE_CLOUD_STORAGE) {
    await initializeCloudStorage();

    const file = bucket.file(filePath);
    const [contents] = await file.download();
    return contents.toString();
  } else {
    // Local file system
    const fullPath = path.join(config.PUBLIC_DIR, filePath);
    return await fs.readFile(fullPath, 'utf8');
  }
}

/**
 * Check if file exists in storage (local or cloud)
 */
async function fileExists(filePath) {
  if (config.USE_CLOUD_STORAGE) {
    await initializeCloudStorage();

    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } else {
    // Local file system
    const fullPath = path.join(config.PUBLIC_DIR, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * List files in directory (local or cloud)
 */
async function listFiles(directory = '') {
  if (config.USE_CLOUD_STORAGE) {
    await initializeCloudStorage();

    const [files] = await bucket.getFiles({
      prefix: directory,
    });

    return files.map(file => file.name);
  } else {
    // Local file system
    const fullPath = path.join(config.PUBLIC_DIR, directory);
    try {
      const files = await fs.readdir(fullPath);
      return files;
    } catch {
      return [];
    }
  }
}

/**
 * Get public URL for a file
 */
function getPublicUrl(filePath) {
  if (config.USE_CLOUD_STORAGE) {
    return `https://storage.googleapis.com/${config.STORAGE_BUCKET}/${filePath}`;
  } else {
    // Local development URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/${filePath}`;
  }
}

/**
 * Delete file from storage (local or cloud)
 */
async function deleteFile(filePath) {
  if (config.USE_CLOUD_STORAGE) {
    await initializeCloudStorage();

    const file = bucket.file(filePath);
    await file.delete();
    console.log(`🗑️ Deleted from GCS: ${filePath}`);
  } else {
    // Local file system
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
}

/**
 * Copy static assets to cloud storage (for deployment)
 */
async function uploadStaticAssets() {
  if (!config.USE_CLOUD_STORAGE) {
    return;
  }

  await initializeCloudStorage();

  const assetsToUpload = [
    { local: 'public/styles', remote: 'styles' },
    { local: 'public/scripts', remote: 'scripts' },
  ];

  for (const asset of assetsToUpload) {
    try {
      const localPath = path.join(config.ROOT_DIR, asset.local);
      const files = await fs.readdir(localPath, { recursive: true });

      for (const file of files) {
        const localFilePath = path.join(localPath, file);
        const stat = await fs.stat(localFilePath);

        if (stat.isFile()) {
          const content = await fs.readFile(localFilePath);
          const remotePath = `${asset.remote}/${file}`;

          const gcsFile = bucket.file(remotePath);
          await gcsFile.save(content, {
            metadata: {
              contentType: getContentType(file),
            },
          });

          console.log(`📤 Uploaded asset: ${remotePath}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to upload ${asset.local}:`, error.message);
    }
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
  };

  return contentTypes[ext] || 'application/octet-stream';
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
};