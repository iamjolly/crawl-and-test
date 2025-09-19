const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const config = require('../core/config');
const { generateIndexHTML } = require('../generators/index');
const { formatTimestamp, parseTimestampFromFilename } = require('../scripts/utils');

const app = express();

// Store active crawl jobs
const activeJobs = new Map();

// Template loading utilities
function loadTemplate(templateName) {
    const templatePath = path.join(config.TEMPLATES_DIR, `${templateName}.html`);
    try {
        return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        console.error(`❌ Failed to load template: ${templateName}`, error.message);
        return '';
    }
}

function renderTemplate(templateContent, data) {
    let rendered = templateContent;
    for (const [key, value] of Object.entries(data)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(placeholder, value || '');
    }
    return rendered;
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/reports', express.static(config.REPORTS_DIR));
app.use('/styles', express.static(config.PUBLIC_STYLES_DIR));
app.use('/scripts', express.static(config.PUBLIC_SCRIPTS_DIR));
app.use(express.static(config.PUBLIC_DIR)); // Serve static files from public directory

// Utility function to get all report directories
function getReportDirectories() {
    const reportsDir = config.REPORTS_DIR;
    if (!fs.existsSync(reportsDir)) {
        return [];
    }
    
    return fs.readdirSync(reportsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
            const dirPath = path.join(reportsDir, dirent.name);
            const files = fs.readdirSync(dirPath);
            const reports = files.filter(file => file.endsWith('.html'));
            return {
                domain: dirent.name,
                reportCount: reports.length,
                lastReport: reports.length > 0 ? reports.sort().pop() : null
            };
        });
}

// Generate reports list HTML for reports index page
function generateReportsListHTML() {
    const reportDirs = getReportDirectories();
    
    if (reportDirs.length === 0) {
        return '<p class="no-reports">No reports generated yet. Start a crawl to create your first report!</p>';
    }
    
    return reportDirs.map(dir => {
        const dirPath = path.join(config.REPORTS_DIR, dir.domain);
        const files = fs.readdirSync(dirPath);
        const reports = files.filter(file => file.endsWith('.html'));
        
        const reportItems = reports.map(reportFile => {
            const reportPath = `/reports/${dir.domain}/${reportFile}`;
            const displayDate = parseTimestampFromFilename(reportFile);
            
            return `
                <tr>
                    <td><a href="${reportPath}" class="report-link">${reportFile.replace('.html', '')}</a></td>
                    <td>${displayDate}</td>
                </tr>
            `;
        }).join('');
        
        return `
            <div class="domain-section">
                <h3>${dir.domain}</h3>
                <p>${dir.reportCount} report(s) available</p>
                <table class="reports-table">
                    <thead>
                        <tr>
                            <th>Report</th>
                            <th>Generated</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportItems}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');
}

// Generate domain-specific reports list HTML
function generateDomainReportsListHTML(domain) {
    const domainDir = path.join(config.REPORTS_DIR, domain);
    const files = fs.readdirSync(domainDir);
    const reports = files.filter(file => file.endsWith('.html'));
    
    if (reports.length === 0) {
        return '<tr><td colspan="2" class="no-reports">No reports found for this domain.</td></tr>';
    }
    
    return reports.map(reportFile => {
        const reportPath = `/reports/${domain}/${reportFile}`;
        const displayDate = parseTimestampFromFilename(reportFile);
        
        return `
            <tr>
                <td><a href="${reportPath}" class="report-link">${reportFile.replace('.html', '')}</a></td>
                <td>${displayDate}</td>
            </tr>
        `;
    }).join('');
}

// Generate reports index HTML using template
function generateReportsIndexHTML() {
    const template = loadTemplate('reports-index');
    const reportsList = generateReportsListHTML();
    
    return renderTemplate(template, {
        reportsList
    });
}

// Generate HTML for domain-specific reports page using template
function generateDomainReportsHTML(domain) {
    const domainDir = path.join(config.REPORTS_DIR, domain);
    const files = fs.readdirSync(domainDir);
    const reports = files.filter(file => file.endsWith('.html'));
    
    const template = loadTemplate('domain-reports');
    const reportsList = generateDomainReportsListHTML(domain);
    
    return renderTemplate(template, {
        domain,
        reportCount: reports.length,
        reportsList
    });
}

// Routes
app.get('/', (req, res) => {
    // Serve the dashboard index.html (regenerated on server startup)
    const indexPath = path.join(config.PUBLIC_DIR, 'index.html');
    res.sendFile(indexPath);
});

// Reports index page
app.get('/reports/', (req, res) => {
    res.send(generateReportsIndexHTML());
});

// Domain-specific reports page
app.get('/browse/:domain', (req, res) => {
    const domain = req.params.domain;
    const domainDir = path.join(config.REPORTS_DIR, domain);
    
    // Check if domain directory exists
    if (!fs.existsSync(domainDir)) {
        const template = loadTemplate('error-404');
        const errorHTML = renderTemplate(template, {
            errorTitle: 'Domain Not Found',
            errorMessage: `No reports found for domain: ${domain}`
        });
        return res.status(404).send(errorHTML);
    }
    
    res.send(generateDomainReportsHTML(domain));
});

// API endpoint to get active jobs
app.get('/api/jobs', (req, res) => {
    const jobs = Array.from(activeJobs.entries()).map(([jobId, job]) => ({
        jobId,
        ...job
    }));
    res.json(jobs);
});

// API endpoint to get current reports
app.get('/api/reports', (req, res) => {
    const reportDirs = getReportDirectories();
    res.json(reportDirs);
});

// Start a new crawl
app.post('/crawl', (req, res) => {
    const { url, wcagVersion = '2.1', wcagLevel = 'AA', maxDepth = '2', maxPages = '50' } = req.body;
    
    if (!url) {
        return res.status(400).json({ success: false, error: 'URL is required' });
    }
    
    const jobId = uuidv4();
    const startTime = new Date().toISOString();
    
    // Store job info
    activeJobs.set(jobId, {
        url,
        wcagVersion,
        wcagLevel,
        maxDepth: parseInt(maxDepth),
        maxPages: parseInt(maxPages),
        status: 'running',
        startTime
    });
    
    // Start crawl process
    const domain = new URL(url).hostname;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilename = `${domain}_wcag${wcagVersion}_${wcagLevel}_${timestamp}.json`;
    
    const args = [
        '--seed', url,
        '--depth', maxDepth,
        '--max-pages', maxPages,
        '--wcag-version', wcagVersion,
        '--wcag-level', wcagLevel,
        '--output', outputFilename,
        '--html'  // Generate HTML report
    ];
    
    const crawlProcess = spawn('node', ['src/core/crawler.js', ...args], {
        cwd: process.cwd(),
        stdio: 'pipe'
    });
    
    // Log process output for debugging
    crawlProcess.stdout.on('data', (data) => {
        console.log(`Crawl ${jobId}: ${data}`);
    });
    
    crawlProcess.stderr.on('data', (data) => {
        console.error(`Crawl ${jobId} error: ${data}`);
    });
    
    // Handle process completion
    crawlProcess.on('close', (code) => {
        const job = activeJobs.get(jobId);
        if (job) {
            job.status = code === 0 ? 'completed' : 'error';
            job.endTime = new Date().toISOString();
            
            // Remove job after 5 minutes
            setTimeout(() => {
                activeJobs.delete(jobId);
            }, 5 * 60 * 1000);
            
            // Regenerate index.html if crawl was successful
            if (code === 0) {
                try {
                    generateIndexHTML();
                } catch (error) {
                    console.error('Error regenerating index.html:', error);
                }
            }
        }
    });
    
    crawlProcess.on('error', (error) => {
        console.error('Crawl process error:', error);
        const job = activeJobs.get(jobId);
        if (job) {
            job.status = 'error';
            job.error = error.message;
        }
    });
    
    res.json({ success: true, jobId });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CATS Dashboard running at http://localhost:${PORT}`);
    console.log(`📊 View your dashboard: http://localhost:${PORT}`);
    console.log(`📁 Reports directory: ${config.REPORTS_DIR}`);
    
    // Always regenerate index.html on server startup
    console.log('🔄 Regenerating dashboard index.html...');
    generateIndexHTML();
    console.log('✅ Dashboard index.html regenerated');
});