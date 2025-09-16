#!/usr/bin/env node

/**
 * Simple static file server for the public directory
 * Serves the generated CATS accessibility reports
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 3001;
const PUBLIC_DIR = path.join(__dirname, '../../public');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const mimeType = mimeTypes[ext] || 'text/plain';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

function serveDirectory(dirPath, res) {
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    
    const relativeDir = path.relative(PUBLIC_DIR, dirPath);
    const title = relativeDir || 'CATS Reports';
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .breadcrumb { color: #666; margin-bottom: 20px; }
        .file-list { list-style: none; padding: 0; }
        .file-item { margin: 8px 0; }
        .file-link { display: block; padding: 12px 16px; background: #f8f9fa; border-radius: 4px; text-decoration: none; color: #333; border-left: 4px solid #007bff; transition: background 0.2s; }
        .file-link:hover { background: #e9ecef; }
        .folder { border-left-color: #ffc107; }
        .folder:before { content: "📁 "; }
        .html-file:before { content: "📄 "; }
        .json-file:before { content: "� "; }
        .back-link { color: #007bff; text-decoration: none; margin-bottom: 20px; display: inline-block; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 ${title}</h1>`;
    
    if (relativeDir) {
      const parentPath = path.dirname(relativeDir);
      const backUrl = parentPath === '.' ? '/' : `/${parentPath}`;
      html += `<a href="${backUrl}" class="back-link">← Back to parent directory</a>`;
    }
    
    html += `<div class="breadcrumb">Path: /${relativeDir}</div>
        <ul class="file-list">`;
    
    // Sort files: directories first, then by name
    files.sort((a, b) => {
      const aPath = path.join(dirPath, a);
      const bPath = path.join(dirPath, b);
      const aIsDir = fs.statSync(aPath).isDirectory();
      const bIsDir = fs.statSync(bPath).isDirectory();
      
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      const relativePath = path.relative(PUBLIC_DIR, filePath);
      const url = `/${relativePath}`;
      
      let className = 'file-link';
      if (stat.isDirectory()) {
        className += ' folder';
      } else if (file.endsWith('.html')) {
        className += ' html-file';
      } else if (file.endsWith('.json')) {
        className += ' json-file';
      }
      
      html += `<li class="file-item"><a href="${url}" class="${className}">${file}</a></li>`;
    });
    
    html += `</ul>
    </div>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
}

const server = http.createServer((req, res) => {
  let requestPath = decodeURIComponent(req.url);
  
  // Remove query string
  const queryIndex = requestPath.indexOf('?');
  if (queryIndex !== -1) {
    requestPath = requestPath.substring(0, queryIndex);
  }
  
  // Security: prevent directory traversal
  if (requestPath.includes('..')) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  
  // Default to index
  if (requestPath === '/') {
    requestPath = '';
  }
  
  const fullPath = path.join(PUBLIC_DIR, requestPath);
  
  // Check if file/directory exists
  fs.stat(fullPath, (err, stat) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    
    if (stat.isDirectory()) {
      serveDirectory(fullPath, res);
    } else {
      serveFile(fullPath, res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🌐 Static server running at http://localhost:${PORT}`);
  console.log(`📂 Serving: ${PUBLIC_DIR}`);
  console.log(`� Browse your CATS accessibility reports!`);
});