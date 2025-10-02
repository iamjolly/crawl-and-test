const fs = require('fs');
const path = require('path');
const config = require('../core/config');
const storage = require('../utils/storage');

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

  return reportDirs
    .map(dir => {
      const lastReportUrl = dir.lastReport ? `/reports/${dir.domain}/${dir.lastReport}` : '#';
      return `
            <div class="report-item">
                <h3>${dir.domain}</h3>
                <p>${dir.reportCount} report(s) available</p>
                ${
                  dir.lastReport
                    ? `
                    <a href="${lastReportUrl}" class="btn btn-view">View Latest Report</a>
                    <a href="/browse/${dir.domain}" class="btn btn-browse">Browse All</a>
                `
                    : '<p class="no-reports">No reports yet</p>'
                }
            </div>
        `;
    })
    .join('');
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
