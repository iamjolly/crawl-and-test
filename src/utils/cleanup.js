#!/usr/bin/env node

/**
 * Cleanup script to remove old HTML files from /reports/ directory
 * while preserving the JSON source data files
 */

const fs = require('fs');
const path = require('path');

function cleanupOldHtmlFiles(reportsDir) {
  let removedCount = 0;
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.html')) {
        console.log(`🗑️  Removing old HTML: ${path.relative(reportsDir, fullPath)}`);
        fs.unlinkSync(fullPath);
        removedCount++;
      }
    }
  }
  
  scanDirectory(reportsDir);
  return removedCount;
}

function main() {
  const reportsDir = path.join(__dirname, 'reports');
  
  console.log('🧹 Cleaning up old HTML files from /reports/ directory');
  console.log('📂 Preserving JSON source data files');
  console.log('=====================================\n');
  
  if (!fs.existsSync(reportsDir)) {
    console.log('❌ No /reports/ directory found');
    process.exit(1);
  }
  
  const removedCount = cleanupOldHtmlFiles(reportsDir);
  
  console.log('\n=====================================');
  console.log(`✅ Cleanup complete! Removed ${removedCount} old HTML files`);
  console.log('💾 JSON source data preserved');
  console.log('🌐 Use "npm run build" to generate new modern HTML reports');
}

if (require.main === module) {
  main();
}

module.exports = { cleanupOldHtmlFiles };