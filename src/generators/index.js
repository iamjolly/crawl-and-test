const fs = require('fs');
const path = require('path');
const config = require('../core/config');
const storage = require('../utils/storage');

// Extract metadata from JSON report
async function extractReportMetadata(domain, htmlFilename) {
  try {
    // Convert HTML filename to JSON filename
    const jsonFilename = htmlFilename.replace('.html', '.json');
    const jsonPath = path.join(config.REPORTS_DIR, domain, jsonFilename);

    if (!fs.existsSync(jsonPath)) {
      return null;
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const reportData = JSON.parse(jsonContent);

    // Count pages and total violations
    const pageCount = Array.isArray(reportData) ? reportData.length : 0;
    let totalViolations = 0;

    if (Array.isArray(reportData)) {
      reportData.forEach(page => {
        if (page.violations && Array.isArray(page.violations)) {
          totalViolations += page.violations.length;
        }
      });
    }

    return {
      pageCount,
      totalViolations,
    };
  } catch (error) {
    console.error(`Failed to extract metadata for ${domain}/${htmlFilename}:`, error.message);
    return null;
  }
}

// Utility function to get all report directories
async function getReportDirectories() {
  try {
    if (config.USE_CLOUD_STORAGE) {
      // Get reports from cloud storage
      const files = await storage.listFiles('reports/');
      const domainMap = new Map();

      files.forEach(filePath => {
        // Extract domain from path like "reports/example.com/report.html"
        const parts = filePath.split('/');
        if (parts.length >= 3 && parts[0] === 'reports') {
          const domain = parts[1];
          const fileName = parts[parts.length - 1];

          if (fileName.endsWith('.html')) {
            if (!domainMap.has(domain)) {
              domainMap.set(domain, []);
            }
            domainMap.get(domain).push(fileName);
          }
        }
      });

      return Array.from(domainMap.entries()).map(([domain, reports]) => ({
        domain,
        reportCount: reports.length,
        lastReport: reports.length > 0 ? reports.sort().pop() : null,
      }));
    } else {
      // Fallback to local filesystem
      const reportsDir = config.REPORTS_DIR;
      if (!fs.existsSync(reportsDir)) {
        return [];
      }

      return fs
        .readdirSync(reportsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
          const dirPath = path.join(reportsDir, dirent.name);
          const files = fs.readdirSync(dirPath);
          const reports = files.filter(file => file.endsWith('.html'));
          return {
            domain: dirent.name,
            reportCount: reports.length,
            lastReport: reports.length > 0 ? reports.sort().pop() : null,
          };
        });
    }
  } catch (error) {
    console.error('❌ Failed to get report directories:', error.message);
    return [];
  }
}

// Generate reports list HTML
async function generateReportsListHTML() {
  const reportDirs = await getReportDirectories();

  if (reportDirs.length === 0) {
    return '<p class="no-reports">No reports generated yet. Start a crawl to create your first report!</p>';
  }

  const reportsHTML = await Promise.all(
    reportDirs.map(async dir => {
      const lastReportUrl = dir.lastReport ? `/reports/${dir.domain}/${dir.lastReport}` : '#';

      // Extract metadata from filename (e.g., "domain_wcag2.1_AA_2025-10-10T22-06-31.html")
      let wcagInfo = '';
      let timestamp = '';
      let metadata = null;

      if (dir.lastReport) {
        const wcagMatch = dir.lastReport.match(/wcag(\d\.\d)_([A-Z]{1,3})/);
        const timestampMatch = dir.lastReport.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);

        if (wcagMatch) {
          wcagInfo = `WCAG ${wcagMatch[1]} Level ${wcagMatch[2]}`;
        }
        if (timestampMatch) {
          // Convert filename timestamp format back to ISO
          timestamp = timestampMatch[1]
            .replace(/-/g, ':')
            .replace(/T(\d{2}):(\d{2}):(\d{2})/, 'T$1:$2:$3Z');
        }

        // Extract page count and violations from JSON
        metadata = await extractReportMetadata(dir.domain, dir.lastReport);
      }

      return `
            <div class="report-card">
                <div class="report-card__header">
                    <h3 class="report-card__domain">${dir.domain}</h3>
                    ${wcagInfo ? `<p class="report-card__wcag">${wcagInfo}</p>` : ''}
                </div>
                ${timestamp ? `<p class="report-card__timestamp"><time datetime="${timestamp}">${timestamp}</time></p>` : ''}
                ${
                  metadata
                    ? `<p class="report-card__stats">${metadata.pageCount} page${metadata.pageCount !== 1 ? 's' : ''} • ${metadata.totalViolations} violation${metadata.totalViolations !== 1 ? 's' : ''}</p>`
                    : ''
                }
                <div class="report-card__actions">
                ${
                  dir.lastReport
                    ? `
                        <a href="${lastReportUrl}" class="btn btn-primary btn-block">View Latest Report →</a>
                        ${dir.reportCount > 1 ? `<a href="/browse/${dir.domain}" class="btn btn-secondary btn-block">Browse All (${dir.reportCount})</a>` : ''}
                `
                    : '<p class="no-reports">No reports yet</p>'
                }
                </div>
            </div>
        `;
    })
  );

  return reportsHTML.join('');
}

// Generate index.html from template
async function generateIndexHTML() {
  console.log('🏠 Generating dashboard index.html...');

  // Read the dashboard template
  const templatePath = path.join(config.TEMPLATES_DIR, 'dashboard.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Dashboard template not found at: ${templatePath}`);
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  // Generate dynamic content
  const reportsListHTML = await generateReportsListHTML();

  // Replace placeholders
  const html = template
    .replace('{{title}}', 'CATS Accessibility Dashboard')
    .replace('{{pageTitle}}', 'CATS Accessibility Dashboard')
    .replace('{{pageDescription}}', 'Monitor and test website accessibility compliance')
    .replace('{{reportsList}}', reportsListHTML);

  // Write to public directory
  const outputPath = path.join(config.PUBLIC_DIR, 'index.html');

  // Ensure public directory exists
  if (!fs.existsSync(config.PUBLIC_DIR)) {
    fs.mkdirSync(config.PUBLIC_DIR, { recursive: true });
  }

  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`✅ Generated: ${outputPath}`);

  return html;
}

// Export functions
module.exports = {
  generateIndexHTML,
  generateReportsListHTML,
  getReportDirectories,
};

// Allow running as script
if (require.main === module) {
  try {
    generateIndexHTML();
    console.log('🎉 Dashboard index.html generated successfully!');
  } catch (error) {
    console.error('❌ Error generating dashboard index.html:', error.message);
    process.exit(1);
  }
}
