const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const config = require('../core/config');
const { generateIndexHTML } = require('../generators/index');
const { formatTimestamp } = require('../scripts/utils');

const app = express();

// Store active crawl jobs
const activeJobs = new Map();

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

// Generate reports index HTML
function generateReportsIndexHTML() {
    const reportDirs = getReportDirectories();
    
    const reportsList = reportDirs.length > 0 
        ? reportDirs.map(dir => {
            const dirPath = path.join(config.REPORTS_DIR, dir.domain);
            const files = fs.readdirSync(dirPath);
            const reports = files.filter(file => file.endsWith('.html'));
            
            const reportItems = reports.map(reportFile => {
                const reportPath = `/reports/${dir.domain}/${reportFile}`;
                // Handle multiple timestamp formats in filenames
                const reportDate = reportFile.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d{3}Z|-\d{3})?)/);
                let displayDate = 'Unknown';
                
                if (reportDate) {
                    // Convert filename timestamp format to ISO format
                    let isoTimestamp = reportDate[1];
                    
                    // Handle format with milliseconds: 2025-09-16T18-42-30-245Z or similar
                    if (isoTimestamp.match(/-\d{3}Z?$/)) {
                        isoTimestamp = isoTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})(Z?)/, 'T$1:$2:$3.$4$5');
                    } else {
                        // Handle standard format: 2025-09-14T11-35-12
                        isoTimestamp = isoTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
                    }
                    
                    displayDate = formatTimestamp(isoTimestamp);
                }
                
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
        }).join('')
        : '<p class="no-reports">No reports generated yet. Start a crawl to create your first report!</p>';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Reports - CATS</title>
    <link rel="stylesheet" href="/styles/navigation.css">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .domain-section {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            border-left: 4px solid #667eea;
        }
        
        .domain-section h3 {
            margin-bottom: 0.5rem;
            color: #333;
            font-size: 1.3rem;
        }
        
        .domain-section p {
            margin-bottom: 1rem;
            color: #666;
        }
        
        .reports-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .reports-table th {
            background: #495057;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        .reports-table td {
            padding: 12px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .reports-table tr:last-child td {
            border-bottom: none;
        }
        
        .reports-table tr:hover {
            background-color: #f8f9fa;
        }
        
        .report-link {
            color: #003d7a;
            text-decoration: none;
            font-weight: 500;
        }
        
        .report-link:hover {
            color: #002952;
            text-decoration: underline;
        }
        
        .no-reports {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 2rem;
        }
    </style>
</head>
<body>
    <nav class="site-nav" role="navigation" aria-label="Main navigation">
        <div class="nav-container">
            <a href="/" class="nav-brand" aria-label="CATS Home">
                <span>CATS</span>
            </a>
            <ul class="nav-links">
                <li><a href="/" class="nav-link">Dashboard</a></li>
                <li><a href="/reports/" class="nav-link active" aria-current="page">Reports</a></li>
            </ul>
        </div>
    </nav>
    
    <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <div class="breadcrumb-container">
            <ol class="breadcrumb">
                <li><a href="/">Dashboard</a></li>
                <li><span class="current">Reports</span></li>
            </ol>
        </div>
    </nav>
    
    <div class="container">
        <div class="header">
            <h1>Accessibility Reports</h1>
            <p>Browse all generated accessibility reports by domain</p>
        </div>
        
        <main>
            ${reportsList}
        </main>
    </div>
</body>
</html>
    `;
}

// Generate HTML for domain-specific reports page
function generateDomainReportsHTML(domain) {
    const domainDir = path.join(config.REPORTS_DIR, domain);
    const files = fs.readdirSync(domainDir);
    const reports = files.filter(file => file.endsWith('.html'));
    
    const reportsList = reports.length > 0 
        ? reports.map(reportFile => {
            const reportPath = `/reports/${domain}/${reportFile}`;
            // Handle multiple timestamp formats in filenames
            const reportDate = reportFile.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(-\d{3}Z|-\d{3})?)/);
            let displayDate = 'Unknown';
            
            if (reportDate) {
                // Convert filename timestamp format to ISO format
                let isoTimestamp = reportDate[1];
                
                // Handle format with milliseconds: 2025-09-16T18-42-30-245Z or similar
                if (isoTimestamp.match(/-\d{3}Z?$/)) {
                    isoTimestamp = isoTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})(Z?)/, 'T$1:$2:$3.$4$5');
                } else {
                    // Handle standard format: 2025-09-14T11-35-12
                    isoTimestamp = isoTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
                }
                
                displayDate = formatTimestamp(isoTimestamp);
            }
            
            return `
                <tr>
                    <td><a href="${reportPath}" class="report-link">${reportFile.replace('.html', '')}</a></td>
                    <td>${displayDate}</td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="2" class="no-reports">No reports found for this domain.</td></tr>';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Domain Reports: ${domain} - CATS</title>
    <link rel="stylesheet" href="/styles/report.css">
    <link rel="stylesheet" href="/styles/navigation.css">
    <link rel="stylesheet" href="/styles/accessibility.css">
</head>
<body>
    <nav class="site-nav" role="navigation" aria-label="Main navigation">
        <div class="nav-container">
            <a href="/" class="nav-brand" aria-label="CATS Home">
                <span>CATS</span>
            </a>
            <ul class="nav-links">
                <li><a href="/" class="nav-link">Dashboard</a></li>
                <li><a href="/reports/" class="nav-link active" aria-current="page">Reports</a></li>
            </ul>
        </div>
    </nav>
    
    <nav class="breadcrumb-nav" aria-label="Breadcrumb">
        <div class="breadcrumb-container">
            <ol class="breadcrumb">
                <li><a href="/">Dashboard</a></li>
                <li><a href="/reports/">Reports</a></li>
                <li><span class="current">${domain}</span></li>
            </ol>
        </div>
    </nav>
    
    <a href="#main-content" class="skip-link">Skip to main content</a>
    
    <div class="container">
        <a href="/reports/" class="back-button">
            <span class="icon">←</span>
            Back to All Reports
        </a>
        
        <div class="header">
            <h1>Reports for ${domain}</h1>
            <p>${reports.length} report(s) available</p>
        </div>
        
        <main id="main-content">
            <table class="reports-table">
                <thead>
                    <tr>
                        <th>Report</th>
                        <th>Generated</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportsList}
                </tbody>
            </table>
        </main>
    </div>
</body>
</html>
    `;
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
        return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error: Domain Not Found - CATS</title>
                <link rel="stylesheet" href="/styles/report.css">
            </head>
            <body>
                <div class="container">
                    <h1>Domain Not Found</h1>
                    <p>No reports found for domain: ${domain}</p>
                    <a href="/" class="btn">Back to Dashboard</a>
                </div>
            </body>
            </html>
        `);
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