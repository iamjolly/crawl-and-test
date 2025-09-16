#!/usr/bin/env node

/**
 * HTML Report Regeneration Utility
 * 
 * This script regenerates HTML reports from existing JSON accessibility reports.
 * Useful when HTML reports weren't generated due to missing --html flag or other issues.
 * 
 * Usage:
 *   node regenerate-html.js                    # Regenerate all missing HTML reports
 *   node regenerate-html.js --domain example.com  # Regenerate for specific domain
 *   node regenerate-html.js --file path/to/report.json  # Regenerate specific file
 *   node regenerate-html.js --detailed         # Force regenerate with detailed info (even if HTML exists)
 *   node regenerate-html.js --detailed --domain example.com  # Force detailed for specific domain
 */

const fs = require('fs');
const path = require('path');
const config = require('../core/config');

// Template and asset loading utilities
function loadTemplate(templateName) {
  const templatePath = path.join(config.TEMPLATES_DIR, `${templateName}.html`);
  try {
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error(`❌ Failed to load template: ${templateName}`, error.message);
    return '';
  }
}

function loadCSS() {
  const cssFiles = ['report.css', 'accordion.css', 'accessibility.css'];
  let combinedCSS = '';
  
  cssFiles.forEach(file => {
    const cssPath = path.join(config.STYLES_DIR, file);
    try {
      combinedCSS += fs.readFileSync(cssPath, 'utf8') + '\n';
    } catch (error) {
      console.error(`❌ Failed to load CSS file: ${file}`, error.message);
    }
  });
  
  return combinedCSS;
}

function loadJS() {
  const jsFiles = ['utils.js', 'accordion.js'];
  let combinedJS = '';
  
  jsFiles.forEach(file => {
    const jsPath = path.join(config.SCRIPTS_DIR, file);
    try {
      combinedJS += fs.readFileSync(jsPath, 'utf8') + '\n';
    } catch (error) {
      console.error(`❌ Failed to load JS file: ${file}`, error.message);
    }
  });
  
  return combinedJS;
}

// HTML escaping utility function
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensurePublicDirectory() {
  const publicDir = config.PUBLIC_DIR;
  const reportsDir = config.REPORTS_DIR;
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  return { publicDir, reportsDir };
}

function copyAssetsToPublic() {
  const { publicDir } = ensurePublicDirectory();
  const stylesDir = path.join(publicDir, 'styles');
  const scriptsDir = path.join(publicDir, 'scripts');
  
  // Create styles and scripts directories
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }
  
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  // Copy CSS files
  const cssFiles = ['report.css', 'accordion.css', 'accessibility.css'];
  cssFiles.forEach(file => {
    const srcPath = path.join(__dirname, 'src', 'styles', file);
    const destPath = path.join(stylesDir, file);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  });
  
  // Copy JS files
  const jsFiles = ['accordion.js', 'utils.js'];
  jsFiles.forEach(file => {
    const srcPath = path.join(__dirname, 'src', 'scripts', file);
    const destPath = path.join(scriptsDir, file);
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Helper function to generate issues sections
function generateIssuesSection(title, issues, type) {
  let content = `
    <div class="issue-section">
      <h4>${title} (${issues.length})</h4>`;
  
  issues.forEach(issue => {
    const impactClass = issue.impact ? `impact-${issue.impact}` : 'impact-minor';
    const issueClass = type === 'warning' ? 'warning' : '';
    const borderColor = type === 'warning' ? '#ffc107' : '#dc3545';
    
    content += `
      <div class="issue ${issueClass}">
        <div class="issue-title">${escapeHtml(issue.id)}</div>
        <div class="issue-impact ${impactClass}">${escapeHtml(issue.impact || 'unknown')} impact</div>
        <div class="issue-description">${escapeHtml(issue.description)}</div>
        <div class="issue-help">
          <strong>Help:</strong> <a href="${issue.helpUrl}" target="_blank">${escapeHtml(issue.help)}</a>
        </div>`;
    
    if (issue.nodes && issue.nodes.length > 0) {
      const elementText = type === 'warning' ? 'Elements Needing Review' : 'Affected Elements';
      content += `<div style="margin-top: 12px;"><strong>${elementText} (${issue.nodes.length}):</strong></div>`;
      
      issue.nodes.forEach((node, nodeIndex) => {
        content += `<div class="issue-node" style="margin: 8px 0; padding: 8px; border-left: 3px solid ${borderColor}; background: #f8f9fa;">`;
        content += `<strong>Element ${nodeIndex + 1}:</strong>`;
        
        // Add target selectors
        if (node.target && node.target.length > 0) {
          content += `
            <div class="issue-target">
              <strong>Selector:</strong> ${escapeHtml(node.target.join(' > '))}
            </div>`;
        }
        
        // Add HTML snippet
        if (node.html) {
          content += `
            <div class="issue-html">
              <strong>HTML:</strong><br>
              ${escapeHtml(node.html)}
            </div>`;
        }
        
        // Add failure summary
        if (node.failureSummary) {
          const failureLabel = type === 'warning' ? 'Review Needed' : 'Failure';
          content += `
            <div class="issue-failure">
              <strong>${failureLabel}:</strong> ${escapeHtml(node.failureSummary)}
            </div>`;
        }
        
        // Add specific message
        if (node.message) {
          content += `
            <div style="margin: 8px 0; font-size: 13px;">
              <strong>Details:</strong> ${escapeHtml(node.message)}
            </div>`;
        }
        
        content += `</div>`;
      });
    }
    
    content += `</div>`;
  });
  
  content += `</div>`;
  return content;
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// HTML template for accessibility reports
function generateHTMLReport(data, filename) {
  // Handle both old format {summary, pages} and new format (array of pages)
  let pages, summary;
  
  if (Array.isArray(data)) {
    // New format: data is directly an array of pages
    pages = data;
    // Generate summary from pages
    const totalPages = pages.length;
    const totalViolations = pages.reduce((sum, page) => sum + (page.violations?.length || 0), 0);
    const totalIncomplete = pages.reduce((sum, page) => sum + (page.incomplete?.length || 0), 0);
    const pagesWithIssues = pages.filter(page => 
      (page.violations?.length || 0) > 0 || (page.incomplete?.length || 0) > 0
    ).length;
    
    summary = {
      totalPages,
      totalViolations,
      totalIncomplete,
      pagesWithIssues,
      pagesPassed: totalPages - pagesWithIssues
    };
  } else {
    // Old format: data has summary and pages properties
    pages = data.pages || [];
    summary = data.summary || {};
  }
  
  // Get domain from first page URL or filename
  let domain = 'Unknown';
  if (pages.length > 0 && pages[0].pageUrl) {
    try {
      domain = new URL(pages[0].pageUrl).hostname;
    } catch (e) {
      // Fallback to extracting from filename
      domain = filename.split('_')[0] || 'Unknown';
    }
  }
  
  // Get timestamp from first page or filename
  let timestamp = new Date().toISOString();
  if (pages.length > 0 && pages[0].timestamp) {
    timestamp = pages[0].timestamp;
  } else {
    // Try to extract from filename
    const timestampMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
    if (timestampMatch) {
      timestamp = timestampMatch[1].replace(/-/g, ':');
    }
  }
  
  // Get WCAG info from first page or filename
  let wcagInfo = 'WCAG 2.1 Level AA';
  if (pages.length > 0 && pages[0].toolOptions?.runOnly?.values) {
    const tags = pages[0].toolOptions.runOnly.values;
    if (tags.includes('wcag21aa')) wcagInfo = 'WCAG 2.1 Level AA';
    else if (tags.includes('wcag21a')) wcagInfo = 'WCAG 2.1 Level A';
    else if (tags.includes('wcag2aa')) wcagInfo = 'WCAG 2.0 Level AA';
    else if (tags.includes('wcag2a')) wcagInfo = 'WCAG 2.0 Level A';
  }

  // Load templates and assets
  const baseTemplate = loadTemplate('base');
  const summaryCardTemplate = loadTemplate('summary-card');
  const pagesSectionTemplate = loadTemplate('pages-section');
  const pageCardTemplate = loadTemplate('page-card');
  const noIssuesTemplate = loadTemplate('no-issues');
  const css = loadCSS();
  const js = loadJS();

  // Generate summary cards
  const summaryCards = [
    { title: '📄 Total Pages', value: summary.totalPages || 0, type: '' },
    { title: '❌ Total Violations', value: summary.totalViolations || 0, type: 'error' },
    { title: '⚠️ Total Warnings', value: summary.totalIncomplete || 0, type: 'warning' },
    { title: '✅ Pages Passed', value: summary.pagesPassed || 0, type: '' }
  ].map(card => 
    summaryCardTemplate
      .replace(/{{title}}/g, card.title)
      .replace(/{{value}}/g, card.value)
      .replace(/{{cardClass}}/g, card.type ? `summary-card-${card.type}` : '')
  ).join('');

  // Generate pages content
  let pagesContent = '';
  
  if (!pages || pages.length === 0) {
    pagesContent = noIssuesTemplate;
  } else {
    // Generate individual page cards
    const pageCards = pages.map((page, index) => {
      const violations = page.violations || [];
      const incomplete = page.incomplete || [];
      const totalIssues = violations.length + incomplete.length;
      const pageId = `page-${index + 1}`;
      const headerId = `${pageId}-header`;
      const contentId = `${pageId}-content`;

      // Generate page stats badges
      const pageStats = [];
      if (violations.length > 0) {
        pageStats.push(`<span class="stat-badge stat-violations">❌ ${violations.length} violation${violations.length !== 1 ? 's' : ''}</span>`);
      }
      if (incomplete.length > 0) {
        pageStats.push(`<span class="stat-badge stat-warnings">⚠️ ${incomplete.length} warning${incomplete.length !== 1 ? 's' : ''}</span>`);
      }
      if (totalIssues === 0) {
        pageStats.push('<span class="stat-badge stat-passed">✅ No issues</span>');
      }

      // Generate issues content
      let issuesContent = '';
      
      if (totalIssues === 0) {
        issuesContent = `
          <div class="issue-section">
            <div class="no-issues">
              <h4>✅ No accessibility issues found on this page!</h4>
            </div>
          </div>`;
      } else {
        // Process violations
        if (violations.length > 0) {
          issuesContent += generateIssuesSection('❌ Violations', violations, 'violation');
        }
        
        // Process incomplete items
        if (incomplete.length > 0) {
          issuesContent += generateIssuesSection('⚠️ Needs Review', incomplete, 'warning');
        }
      }

      return pageCardTemplate
        .replace(/{{pageNumber}}/g, index + 1)
        .replace(/{{pageTitle}}/g, page.pageTitle ? `${index + 1}. ${page.pageTitle}` : `Page ${index + 1}`)
        .replace(/{{pageUrl}}/g, page.url || page.pageUrl)
        .replace(/{{pageStats}}/g, pageStats.join(''))
        .replace(/{{headerId}}/g, headerId)
        .replace(/{{contentId}}/g, contentId)
        .replace(/{{pageContent}}/g, issuesContent);
    }).join('');

    pagesContent = pagesSectionTemplate.replace(/{{pageCards}}/g, pageCards);
  }

  // Assemble final HTML
  const jsonFilename = filename; // The JSON filename for download link
  const html = baseTemplate
    .replace(/{{title}}/g, `CATS Accessibility Report - ${domain}`)
    .replace(/{{domain}}/g, domain)
    .replace(/{{timestamp}}/g, timestamp)
    .replace(/{{wcagInfo}}/g, wcagInfo)
    .replace(/{{jsonFilename}}/g, jsonFilename)
    .replace(/{{summaryCards}}/g, summaryCards)
    .replace(/{{content}}/g, pagesContent);

  return html;
}

// Find all JSON reports without corresponding HTML files
function findMissingHTMLReports(reportsDir, targetDomain = null) {
  const missingReports = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip if we're filtering by domain and this isn't it
        if (targetDomain && item !== targetDomain) continue;
        scanDirectory(fullPath);
      } else if (item.endsWith('.json')) {
        const htmlPath = fullPath.replace('.json', '.html');
        if (!fs.existsSync(htmlPath)) {
          const domain = path.basename(path.dirname(fullPath));
          missingReports.push({
            jsonPath: fullPath,
            htmlPath: htmlPath,
            domain: domain,
            filename: item
          });
        }
      }
    }
  }
  
  scanDirectory(reportsDir);
  return missingReports;
}

function findAllJSONReports(reportsDir, targetDomain = null) {
  const allReports = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip if we're filtering by domain and this isn't it
        if (targetDomain && item !== targetDomain) continue;
        scanDirectory(fullPath);
      } else if (item.endsWith('.json')) {
        const htmlPath = fullPath.replace('.json', '.html');
        const domain = path.basename(path.dirname(fullPath));
        allReports.push({
          jsonPath: fullPath,
          htmlPath: htmlPath,
          domain: domain,
          filename: item
        });
      }
    }
  }
  
  scanDirectory(reportsDir);
  return allReports;
}

// Regenerate HTML from JSON data
function regenerateHTML(jsonPath, htmlPath) {
  try {
    console.log(`🔄 Processing: ${path.basename(jsonPath)}`);
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ JSON file not found: ${jsonPath}`);
      return false;
    }
    
    // Ensure public directory structure exists
    const { reportsDir } = ensurePublicDirectory();
    
    // Extract domain from original path to maintain directory structure
    const originalReportsDir = config.LEGACY_REPORTS_DIR;
    const relativePath = path.relative(originalReportsDir, jsonPath);
    const domain = path.dirname(relativePath);
    
    // Create domain directory in public/reports if it doesn't exist
    const publicDomainDir = path.join(reportsDir, domain);
    if (!fs.existsSync(publicDomainDir)) {
      fs.mkdirSync(publicDomainDir, { recursive: true });
    }
    
    // Copy JSON file to public directory for download access
    const publicJsonPath = path.join(publicDomainDir, path.basename(jsonPath));
    fs.copyFileSync(jsonPath, publicJsonPath);
    
    // Update HTML path to point to public directory
    const publicHtmlPath = path.join(publicDomainDir, path.basename(htmlPath));
    
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const htmlContent = generateHTMLReport(jsonData, path.basename(jsonPath));
    
    fs.writeFileSync(publicHtmlPath, htmlContent, 'utf8');
    console.log(`✅ Generated: ${path.relative(__dirname, publicHtmlPath)}`);
    console.log(`📄 JSON data: ${path.relative(__dirname, publicJsonPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${jsonPath}:`, error.message);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const reportsDir = config.LEGACY_REPORTS_DIR;
  
  console.log(`🚀 ${config.APP_NAME} HTML Report Regeneration Utility`);
  console.log('📁 Now using modern separated architecture');
  console.log(`📂 Source files: ${config.SRC_DIR}`);  
  console.log(`🌐 Generated reports: ${config.REPORTS_DIR}`);
  console.log('=====================================\n');
  
  // Ensure public directory structure exists
  ensurePublicDirectory();
  
  // Copy CSS and JS assets to public directory
  copyAssetsToPublic();
  
  // Check if reports directory exists
  if (!fs.existsSync(reportsDir)) {
    console.error(`❌ Reports directory not found: ${reportsDir}`);
    process.exit(1);
  }
  
  // Parse command line arguments
  let targetDomain = null;
  let targetFile = null;
  let forceDetailed = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--domain' && i + 1 < args.length) {
      targetDomain = args[i + 1];
      i++;
    } else if (args[i] === '--file' && i + 1 < args.length) {
      targetFile = args[i + 1];
      i++;
    } else if (args[i] === '--detailed') {
      forceDetailed = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage:');
      console.log('  node regenerate-html.js                    # Regenerate all missing HTML reports');
      console.log('  node regenerate-html.js --domain example.com  # Regenerate for specific domain');
      console.log('  node regenerate-html.js --file path/to/report.json  # Regenerate specific file');
      console.log('  node regenerate-html.js --detailed         # Force regenerate with detailed info (even if HTML exists)');
      console.log('  node regenerate-html.js --detailed --domain example.com  # Force detailed for specific domain');
      console.log('  node regenerate-html.js --help             # Show this help');
      process.exit(0);
    }
  }
  
  // Handle specific file regeneration
  if (targetFile) {
    const jsonPath = path.resolve(targetFile);
    const htmlPath = jsonPath.replace('.json', '.html');
    
    if (!jsonPath.endsWith('.json')) {
      console.error('❌ File must be a .json file');
      process.exit(1);
    }
    
    const success = regenerateHTML(jsonPath, htmlPath);
    process.exit(success ? 0 : 1);
  }
  
  // Find reports to regenerate
  let reportsToProcess;
  if (forceDetailed) {
    // When --detailed is used, regenerate ALL reports (even if HTML exists)
    reportsToProcess = findAllJSONReports(reportsDir, targetDomain);
    
    if (reportsToProcess.length === 0) {
      if (targetDomain) {
        console.log(`❌ No JSON reports found for domain: ${targetDomain}`);
      } else {
        console.log('❌ No JSON reports found!');
      }
      process.exit(1);
    }
    
    console.log(`🔄 Forcing detailed regeneration of ${reportsToProcess.length} reports:`);
    if (targetDomain) {
      console.log(`📂 Filtering by domain: ${targetDomain}`);
    }
  } else {
    // Normal mode: only regenerate missing HTML reports
    reportsToProcess = findMissingHTMLReports(reportsDir, targetDomain);
    
    if (reportsToProcess.length === 0) {
      if (targetDomain) {
        console.log(`✅ No missing HTML reports found for domain: ${targetDomain}`);
        console.log('💡 Tip: Use --detailed flag to force regenerate with enhanced details');
      } else {
        console.log('✅ All JSON reports already have corresponding HTML files!');
        console.log('💡 Tip: Use --detailed flag to force regenerate with enhanced details');
      }
      process.exit(0);
    }
    
    console.log(`🔍 Found ${reportsToProcess.length} JSON reports without HTML files:`);
    if (targetDomain) {
      console.log(`📂 Filtering by domain: ${targetDomain}`);
    }
  }
  
  console.log();
  
  // Group by domain for better organization
  const reportsByDomain = {};
  reportsToProcess.forEach(report => {
    if (!reportsByDomain[report.domain]) {
      reportsByDomain[report.domain] = [];
    }
    reportsByDomain[report.domain].push(report);
  });
  
  let totalProcessed = 0;
  let totalSuccess = 0;
  
  // Process each domain
  Object.entries(reportsByDomain).forEach(([domain, reports]) => {
    console.log(`\n📂 Domain: ${domain} (${reports.length} reports)`);
    console.log('─'.repeat(50));
    
    reports.forEach(report => {
      totalProcessed++;
      const success = regenerateHTML(report.jsonPath, report.htmlPath);
      if (success) totalSuccess++;
    });
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Summary: ${totalSuccess}/${totalProcessed} HTML reports generated successfully`);
  
  if (totalSuccess < totalProcessed) {
    console.log(`⚠️  ${totalProcessed - totalSuccess} reports failed to generate`);
    process.exit(1);
  } else {
    console.log('🎉 All HTML reports generated successfully!');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateHTMLReport, findMissingHTMLReports, regenerateHTML };