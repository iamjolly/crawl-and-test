#!/usr/bin/env node

/**
 * Build script for Design System Documentation
 * 
 * This script:
 * 1. Compiles the SASS design system
 * 2. Injects the compiled CSS into the showcase HTML
 * 3. Creates a production-ready documentation site
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isDev = process.argv.includes('--dev');
const sassStyle = isDev ? 'expanded' : 'compressed';

console.log('🎨 Building Design System Documentation...');
console.log(`Environment: ${isDev ? 'Development' : 'Production'}`);

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist', 'design-system');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  // Step 1: Compile SASS to CSS
  console.log('📦 Compiling SASS...');
  
  const sassInput = 'src/styles/design-system/_index.scss';
  const cssOutput = 'dist/design-system/design-system.css';
  
  execSync(`sass ${sassInput} ${cssOutput} --style ${sassStyle} --source-map`, {
    stdio: 'inherit'
  });
  
  console.log('✅ SASS compilation complete');
  
  // Step 2: Read the compiled CSS
  console.log('📖 Reading compiled CSS...');
  
  const compiledCSS = fs.readFileSync(cssOutput, 'utf8');
  
  // Step 3: Read the showcase HTML template
  console.log('📄 Processing HTML template...');
  
  const showcaseHTML = fs.readFileSync('tools/design-system/design-system-showcase.html', 'utf8');
  
  // Step 4: Replace the inline styles with compiled CSS
  const updatedHTML = showcaseHTML.replace(
    /(<style>)([\s\S]*?)(<\/style>)/,
    `$1
    /* Design System - Compiled CSS */
    ${compiledCSS}
    $3`
  );
  
  // Step 5: Update links to reference compiled assets
  const finalHTML = updatedHTML
    .replace('href="../_index.scss"', 'href="design-system.css"')
    .replace('href="_testing.scss"', 'href="testing/_testing.css"')
    .replace(
      '<title>Design System Testing Suite</title>',
      '<title>A11y Design System - Documentation</title>'
    );
  
  // Step 6: Write the final HTML
  fs.writeFileSync(path.join(distDir, 'index.html'), finalHTML);
  
  // Step 7: Copy testing files
  console.log('📋 Copying testing files...');
  
  const testingDir = path.join(distDir, 'testing');
  if (!fs.existsSync(testingDir)) {
    fs.mkdirSync(testingDir);
  }
  
  // Compile testing SASS
  execSync(`sass src/styles/design-system/testing/_testing.scss ${testingDir}/_testing.css --style ${sassStyle}`, {
    stdio: 'inherit'
  });
  
  // Copy testing HTML
  fs.copyFileSync(
    'src/styles/design-system/testing/index.html',
    path.join(testingDir, 'index.html')
  );
  
  // Step 8: Copy README
  fs.copyFileSync(
    'src/styles/design-system/README.md',
    path.join(distDir, 'README.md')
  );
  
  // Step 9: Create package info
  const packageInfo = {
    name: '@a11y/design-system',
    version: '1.0.0',
    description: 'A11y Crawl & Test Design System',
    main: 'design-system.css',
    sass: '../src/styles/design-system/_index.scss',
    files: [
      'design-system.css',
      'design-system.css.map',
      'index.html',
      'README.md',
      'testing/'
    ],
    keywords: [
      'design-system',
      'accessibility',
      'a11y',
      'css',
      'sass',
      'components'
    ],
    author: 'A11y Crawl & Test Team',
    license: 'MIT'
  };
  
  fs.writeFileSync(
    path.join(distDir, 'package.json'),
    JSON.stringify(packageInfo, null, 2)
  );
  
  // Step 10: Generate file size report
  console.log('\n📊 Build Summary:');
  console.log('================');
  
  const cssStats = fs.statSync(cssOutput);
  const htmlStats = fs.statSync(path.join(distDir, 'index.html'));
  
  console.log(`CSS: ${(cssStats.size / 1024).toFixed(2)} KB`);
  console.log(`HTML: ${(htmlStats.size / 1024).toFixed(2)} KB`);
  console.log(`Total: ${((cssStats.size + htmlStats.size) / 1024).toFixed(2)} KB`);
  
  console.log('\n🎉 Design System documentation built successfully!');
  console.log(`📁 Output: ${distDir}`);
  console.log(`🌐 View: http://localhost:3001 (run: npm run serve:design-system)`);
  
  if (!isDev) {
    console.log('\n🚀 Production build ready for deployment!');
    console.log('Deploy options:');
    console.log('  • GitHub Pages: npm run deploy:design-system');
    console.log('  • Netlify: npm run deploy:design-system:netlify');
    console.log('  • Custom: Copy dist/design-system/ to your web server');
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}