const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const session = require('express-session');
const passport = require('passport');
const config = require('../core/config');
const { generateIndexHTML } = require('../generators/index');
const { parseTimestampFromFilename } = require('../scripts/utils');
const browserPool = require('../utils/browserPool');
const storage = require('../utils/storage');

// Initialize Passport configuration
require('../config/passport');

const app = express();

// Store active crawl jobs and queue
const activeJobs = new Map();
const queuedJobs = new Map();

// Job status constants
const JOB_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
};

// Job management utilities
function getRunningJobsCount() {
  return Array.from(activeJobs.values()).filter(job => job.status === JOB_STATUS.RUNNING).length;
}

function canStartNewJob() {
  return getRunningJobsCount() < config.MAX_CONCURRENT_JOBS;
}

function processJobQueue() {
  if (!canStartNewJob() || queuedJobs.size === 0) {
    return;
  }

  // Get the oldest queued job
  const [jobId, jobData] = queuedJobs.entries().next().value;
  queuedJobs.delete(jobId);

  // Move job to active jobs and start it
  jobData.status = JOB_STATUS.RUNNING;
  activeJobs.set(jobId, jobData);
  startJobProcess(jobId, jobData);

  console.log(`🚀 Job ${jobId} started from queue`);
}

function cleanupCompletedJobs() {
  const now = Date.now();

  for (const [jobId, job] of activeJobs.entries()) {
    const shouldCleanup =
      ((job.status === JOB_STATUS.COMPLETED ||
        job.status === JOB_STATUS.ERROR ||
        job.status === JOB_STATUS.CANCELLED) &&
        job.endTime &&
        now - new Date(job.endTime).getTime() > config.JOB_CLEANUP_DELAY_MS) ||
      (job.status === JOB_STATUS.RUNNING &&
        now - new Date(job.startTime).getTime() > config.MAX_JOB_RUNTIME_MS);

    if (shouldCleanup) {
      if (job.status === JOB_STATUS.RUNNING) {
        // Timeout the job
        job.status = JOB_STATUS.TIMEOUT;
        job.endTime = new Date().toISOString();
        job.error = 'Job exceeded maximum runtime limit';

        // Kill the process if it exists
        if (job.process && !job.process.killed) {
          job.process.kill('SIGTERM');
        }
      }

      activeJobs.delete(jobId);
      console.log(`🧹 Cleaned up job ${jobId} (${job.status})`);
    }
  }

  // Process queue after cleanup to start any waiting jobs
  processJobQueue();
}

// Periodic cleanup every 30 seconds
setInterval(cleanupCompletedJobs, 30000);

// Start a job process
function startJobProcess(jobId, _jobData) {
  const job = activeJobs.get(jobId);
  if (!job) {
    console.error(`❌ Job ${jobId} not found in activeJobs`);
    return;
  }

  // Update job status to running
  job.status = JOB_STATUS.RUNNING;
  job.startTime = new Date().toISOString();

  // Start crawl process
  const domain = new URL(job.url).hostname;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFilename = `${domain}_wcag${job.wcagVersion}_${job.wcagLevel}_${timestamp}.json`;

  const args = [
    '--seed',
    job.url,
    '--depth',
    job.maxDepth.toString(),
    '--max-pages',
    job.maxPages.toString(),
    '--concurrency',
    (job.crawlerConcurrency || config.DEFAULT_CRAWLER_CONCURRENCY).toString(),
    '--wcag-version',
    job.wcagVersion,
    '--wcag-level',
    job.wcagLevel,
    '--output',
    outputFilename,
    '--html', // Generate HTML report
  ];

  const crawlProcess = spawn('node', ['src/core/crawler.js', ...args], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });

  // Store process reference for potential cancellation
  job.process = crawlProcess;

  // Log process output for debugging
  crawlProcess.stdout.on('data', data => {
    console.log(`Crawl ${jobId}: ${data}`);
  });

  crawlProcess.stderr.on('data', data => {
    console.error(`Crawl ${jobId} error: ${data}`);
  });

  // Handle process completion
  crawlProcess.on('close', async code => {
    const currentJob = activeJobs.get(jobId);
    if (currentJob) {
      currentJob.status = code === 0 ? JOB_STATUS.COMPLETED : JOB_STATUS.ERROR;
      currentJob.endTime = new Date().toISOString();

      // Regenerate index.html if crawl was successful
      if (code === 0) {
        try {
          await generateIndexHTML();
        } catch (error) {
          console.error('Error regenerating index.html:', error);
        }
      }

      console.log(`✅ Job ${jobId} completed with status: ${currentJob.status}`);
    }

    // Process next job in queue
    processJobQueue();
  });

  crawlProcess.on('error', error => {
    console.error('Crawl process error:', error);
    const currentJob = activeJobs.get(jobId);
    if (currentJob) {
      currentJob.status = JOB_STATUS.ERROR;
      currentJob.error = error.message;
      currentJob.endTime = new Date().toISOString();
    }

    // Process next job in queue
    processJobQueue();
  });

  console.log(`🚀 Started job ${jobId} for ${job.url}`);
}

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

function renderTemplate(templateContent, data = {}) {
  let rendered = templateContent;

  // First, process template includes ({{>include:template-name}})
  const includePattern = /\{\{>include:([^}]+)\}\}/g;
  let match;
  while ((match = includePattern.exec(rendered)) !== null) {
    const includeName = match[1];
    const includeContent = loadTemplate(includeName);
    rendered = rendered.replace(match[0], includeContent);
  }

  // Then, replace all placeholders with data
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(placeholder, value || '');
  }

  return rendered;
}

// Generate navigation context for active states
function getNavContext(currentPage) {
  const pages = ['home', 'crawl', 'reports', 'dashboard'];
  const context = {};

  pages.forEach(page => {
    const isActive = page === currentPage;
    context[`${page}Active`] = isActive ? 'main-nav__link--active' : '';
    context[`${page}Aria`] = isActive ? 'aria-current="page"' : '';
  });

  return context;
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
const sessionConfig = {
  secret: process.env.CATS_SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: parseInt(process.env.CATS_SESSION_MAX_AGE || '604800000', 10), // 7 days default
  },
};

// Use PostgreSQL session store if database is configured
if (process.env.CATS_DB_HOST) {
  const pgSession = require('connect-pg-simple')(session);
  const { Pool } = require('pg');

  const pool = new Pool({
    host: process.env.CATS_DB_HOST,
    port: parseInt(process.env.CATS_DB_PORT || '5432', 10),
    database: process.env.CATS_DB_NAME,
    user: process.env.CATS_DB_USER,
    password: process.env.CATS_DB_PASSWORD,
    ssl: process.env.CATS_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  sessionConfig.store = new pgSession({
    pool,
    tableName: 'session',
  });
}

app.use(session(sessionConfig));

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Custom reports middleware - serves from cloud storage or local filesystem
app.use('/reports', async (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  // Skip middleware for routes that should be handled by specific handlers
  if (req.path === '/' || req.path === '') {
    return next(); // Let /reports/ route handle this
  }

  try {
    const filePath = req.path.substring(1); // Remove leading slash to get path after /reports/
    const reportPath = `reports/${filePath}`;

    if (config.USE_CLOUD_STORAGE) {
      // Serve from cloud storage
      const fileExists = await storage.fileExists(reportPath);
      if (!fileExists) {
        return next(); // Let other routes handle it
      }

      const content = await storage.readFile(reportPath);

      // Set appropriate content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.html') {
        res.setHeader('Content-Type', 'text/html');
      } else if (ext === '.json') {
        res.setHeader('Content-Type', 'application/json');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css');
      } else if (ext === '.js') {
        res.setHeader('Content-Type', 'application/javascript');
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
      }

      res.send(content);
    } else {
      // Fallback to local filesystem serving
      const localPath = path.join(config.REPORTS_DIR, filePath);

      // Check if local file exists first
      if (!fs.existsSync(localPath)) {
        return next(); // Let other routes handle it
      }

      res.sendFile(localPath);
    }
  } catch (error) {
    console.error(`❌ Failed to serve report file ${req.path}:`, error.message);
    next(); // Let other routes handle it
  }
});

// ==============================================================================
// ROUTES - Must come BEFORE static middleware to take precedence
// ==============================================================================

// Authentication routes
const authRoutes = require('../routes/auth');
app.use('/api/auth', authRoutes);

// Home page (public landing page)
app.get('/', (req, res) => {
  const template = loadTemplate('home');
  const navContext = getNavContext('home');
  const rendered = renderTemplate(template, navContext);
  res.send(rendered);
});

// Crawl page (dedicated crawl interface)
app.get('/crawl', (req, res) => {
  const template = loadTemplate('crawl');
  const navContext = getNavContext('crawl');
  const rendered = renderTemplate(template, navContext);
  res.send(rendered);
});

// Dashboard overview page
app.get('/dashboard', (req, res) => {
  const template = loadTemplate('dashboard-overview');
  const navContext = getNavContext('dashboard');
  const rendered = renderTemplate(template, navContext);
  res.send(rendered);
});

// ==============================================================================
// STATIC FILE MIDDLEWARE - Must come AFTER specific routes
// ==============================================================================

app.use('/styles', express.static(config.PUBLIC_STYLES_DIR));
app.use('/scripts', express.static(config.PUBLIC_SCRIPTS_DIR));
app.use(express.static(config.PUBLIC_DIR)); // Serve static files from public directory

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

      return Array.from(domainMap.entries()).map(([domain, reports]) => {
        const sortedReports = reports.sort().reverse(); // Newest first
        return {
          domain,
          reportCount: reports.length,
          lastReport: sortedReports.length > 0 ? sortedReports[0] : null,
          reportFiles: sortedReports,
        };
      });
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
          const sortedReports = reports.sort().reverse(); // Newest first
          return {
            domain: dirent.name,
            reportCount: reports.length,
            lastReport: sortedReports.length > 0 ? sortedReports[0] : null,
            reportFiles: sortedReports,
          };
        });
    }
  } catch (error) {
    console.error('❌ Failed to get report directories:', error.message);
    return [];
  }
}

// Generate reports list HTML for reports index page
async function generateReportsListHTML() {
  const reportDirs = await getReportDirectories();

  if (reportDirs.length === 0) {
    return '<p class="no-reports">No reports generated yet. Start a crawl to create your first report!</p>';
  }

  return reportDirs
    .map(dir => {
      // Get report files for this domain
      const reports = dir.reportFiles || [];

      const reportItems = reports
        .map(reportFile => {
          const reportPath = `/reports/${dir.domain}/${reportFile}`;
          const displayDate = parseTimestampFromFilename(reportFile);

          return `
                <tr>
                    <td><a href="${reportPath}" class="report-link">${reportFile.replace('.html', '')}</a></td>
                    <td>${displayDate}</td>
                </tr>
            `;
        })
        .join('');

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
    })
    .join('');
}

// Generate domain-specific reports list HTML
async function generateDomainReportsListHTML(domain) {
  try {
    let reports = [];

    if (config.USE_CLOUD_STORAGE) {
      // Get reports from cloud storage for this specific domain
      const files = await storage.listFiles(`reports/${domain}/`);
      reports = files
        .map(filePath => path.basename(filePath))
        .filter(fileName => fileName.endsWith('.html'))
        .sort()
        .reverse(); // Newest first
    } else {
      // Fallback to local filesystem
      const domainDir = path.join(config.REPORTS_DIR, domain);
      const files = fs.readdirSync(domainDir);
      reports = files
        .filter(file => file.endsWith('.html'))
        .sort()
        .reverse(); // Newest first
    }

    if (reports.length === 0) {
      return '<tr><td colspan="2" class="no-reports">No reports found for this domain.</td></tr>';
    }

    return reports
      .map(reportFile => {
        const reportPath = `/reports/${domain}/${reportFile}`;
        const displayDate = parseTimestampFromFilename(reportFile);

        return `
            <tr>
                <td><a href="${reportPath}" class="report-link">${reportFile.replace('.html', '')}</a></td>
                <td>${displayDate}</td>
            </tr>
        `;
      })
      .join('');
  } catch (error) {
    console.error(`❌ Failed to get domain reports for ${domain}:`, error.message);
    return '<tr><td colspan="2" class="no-reports">Error loading reports for this domain.</td></tr>';
  }
}

// Generate reports index HTML using template
async function generateReportsIndexHTML(navContext = {}) {
  const template = loadTemplate('reports-index');
  const reportsList = await generateReportsListHTML();

  return renderTemplate(template, {
    ...navContext,
    reportsList,
  });
}

// Generate HTML for domain-specific reports page using template
async function generateDomainReportsHTML(domain, navContext = {}) {
  try {
    let reportCount = 0;

    if (config.USE_CLOUD_STORAGE) {
      // Get report count from cloud storage
      const files = await storage.listFiles(`reports/${domain}/`);
      reportCount = files.filter(filePath => path.basename(filePath).endsWith('.html')).length;
    } else {
      // Fallback to local filesystem
      const domainDir = path.join(config.REPORTS_DIR, domain);
      const files = fs.readdirSync(domainDir);
      reportCount = files.filter(file => file.endsWith('.html')).length;
    }

    const template = loadTemplate('domain-reports');
    const reportsList = await generateDomainReportsListHTML(domain);

    return renderTemplate(template, {
      ...navContext,
      domain,
      reportCount,
      reportsList,
    });
  } catch (error) {
    console.error(`❌ Failed to generate domain reports HTML for ${domain}:`, error.message);
    const template = loadTemplate('error-404');
    return renderTemplate(template, {
      ...navContext,
      errorTitle: 'Error Loading Reports',
      errorMessage: `Failed to load reports for domain: ${domain}`,
    });
  }
}

// Reports index page
app.get('/reports/', async (req, res) => {
  try {
    const navContext = getNavContext('reports');
    const html = await generateReportsIndexHTML(navContext);
    res.send(html);
  } catch (error) {
    console.error('❌ Failed to generate reports index:', error.message);
    res.status(500).send('Error loading reports page');
  }
});

// Domain-specific reports page
app.get('/browse/:domain', async (req, res) => {
  const domain = req.params.domain;

  try {
    // Check if domain has reports
    let hasReports = false;

    if (config.USE_CLOUD_STORAGE) {
      const files = await storage.listFiles(`reports/${domain}/`);
      hasReports = files.some(filePath => path.basename(filePath).endsWith('.html'));
    } else {
      const domainDir = path.join(config.REPORTS_DIR, domain);
      hasReports = fs.existsSync(domainDir);
    }

    if (!hasReports) {
      const navContext = getNavContext('reports');
      const template = loadTemplate('error-404');
      const errorHTML = renderTemplate(template, {
        ...navContext,
        errorTitle: 'Domain Not Found',
        errorMessage: `No reports found for domain: ${domain}`,
      });
      return res.status(404).send(errorHTML);
    }

    const navContext = getNavContext('reports');
    const html = await generateDomainReportsHTML(domain, navContext);
    res.send(html);
  } catch (error) {
    console.error(`❌ Failed to load domain reports for ${domain}:`, error.message);
    res.status(500).send('Error loading domain reports');
  }
});

// API endpoint to get active jobs
app.get('/api/jobs', (req, res) => {
  const activeJobsList = Array.from(activeJobs.entries()).map(([jobId, job]) => ({
    jobId,
    ...job,
  }));

  const queuedJobsList = Array.from(queuedJobs.entries()).map(([jobId, job]) => ({
    jobId,
    ...job,
    status: JOB_STATUS.QUEUED,
  }));

  res.json({
    active: activeJobsList,
    queued: queuedJobsList,
    stats: {
      running: getRunningJobsCount(),
      maxConcurrent: config.MAX_CONCURRENT_JOBS,
      canStartNew: canStartNewJob(),
      totalActive: activeJobs.size,
      totalQueued: queuedJobs.size,
    },
    browserPool: browserPool.getStatus(),
    performance: {
      environment: config.IS_CLOUD_RUN ? 'Cloud Run' : 'Local',
      pageTimeout: config.PAGE_NAVIGATION_TIMEOUT,
      maxRetries: config.MAX_RETRIES,
      waitStrategy: config.WAIT_STRATEGY,
      disableImages: config.DISABLE_IMAGES,
    },
  });
});

// API endpoint to get current reports
app.get('/api/reports', async (req, res) => {
  try {
    const reportDirs = await getReportDirectories();
    res.json(reportDirs);
  } catch (error) {
    console.error('❌ Failed to get reports for API:', error.message);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// Start a new crawl
app.post('/crawl', (req, res) => {
  const {
    url,
    wcagVersion = '2.1',
    wcagLevel = 'AA',
    maxDepth = '2',
    maxPages = '50',
    crawlerConcurrency,
  } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  const jobId = uuidv4();
  const createdTime = new Date().toISOString();

  // Create job data
  const jobData = {
    url,
    wcagVersion,
    wcagLevel,
    maxDepth: parseInt(maxDepth),
    maxPages: parseInt(maxPages),
    crawlerConcurrency: crawlerConcurrency
      ? parseInt(crawlerConcurrency)
      : config.DEFAULT_CRAWLER_CONCURRENCY,
    createdTime,
    status: canStartNewJob() ? JOB_STATUS.RUNNING : JOB_STATUS.QUEUED,
  };

  if (canStartNewJob()) {
    // Start immediately - only add to activeJobs
    activeJobs.set(jobId, jobData);
    startJobProcess(jobId, jobData);
    console.log(`🚀 Job ${jobId} started immediately`);
  } else {
    // Add to queue only - will be moved to activeJobs when ready
    jobData.status = JOB_STATUS.QUEUED;
    queuedJobs.set(jobId, jobData);
    console.log(
      `📋 Job ${jobId} queued (${getRunningJobsCount()}/${config.MAX_CONCURRENT_JOBS} slots used)`
    );
  }

  res.json({
    success: true,
    jobId,
    status: jobData.status,
    queuePosition: jobData.status === JOB_STATUS.QUEUED ? queuedJobs.size : 0,
  });
});

// Cancel a job
app.delete('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;

  // Check if job exists in active jobs
  const job = activeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  // Check if job is in queue
  if (queuedJobs.has(jobId)) {
    // Remove from queue
    queuedJobs.delete(jobId);
    job.status = JOB_STATUS.CANCELLED;
    job.endTime = new Date().toISOString();
    console.log(`🚫 Cancelled queued job ${jobId}`);

    return res.json({ success: true, message: 'Queued job cancelled' });
  }

  // Check if job is running
  if (job.status === JOB_STATUS.RUNNING && job.process) {
    // Kill the process
    try {
      job.process.kill('SIGTERM');
      job.status = JOB_STATUS.CANCELLED;
      job.endTime = new Date().toISOString();
      console.log(`🚫 Cancelled running job ${jobId}`);

      // Process next job in queue
      processJobQueue();

      return res.json({ success: true, message: 'Running job cancelled' });
    } catch (error) {
      console.error(`❌ Failed to cancel job ${jobId}:`, error);
      return res.status(500).json({ success: false, error: 'Failed to cancel job' });
    }
  }

  // Job is already completed or in error state
  return res.status(400).json({
    success: false,
    error: 'Job cannot be cancelled (already completed or in error state)',
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CATS Dashboard running at http://localhost:${PORT}`);
  console.log(`📊 View your dashboard: http://localhost:${PORT}`);
  console.log(`📁 Reports directory: ${config.REPORTS_DIR}`);
  console.log(`⚡ Job Management:`);
  console.log(`   • Max concurrent jobs: ${config.MAX_CONCURRENT_JOBS}`);
  console.log(`   • Default crawler concurrency: ${config.DEFAULT_CRAWLER_CONCURRENCY} browsers`);
  console.log(`   • Job timeout: ${Math.floor(config.MAX_JOB_RUNTIME_MS / 60000)} minutes`);
  console.log('');
  console.log('🚀 Performance Configuration:');
  console.log(`   • Environment: ${config.IS_CLOUD_RUN ? '☁️  Cloud Run' : '💻 Local'}`);
  console.log(`   • Page timeout: ${config.PAGE_NAVIGATION_TIMEOUT / 1000}s`);
  console.log(`   • Wait strategy: ${config.WAIT_STRATEGY}`);
  console.log(`   • Max retries: ${config.MAX_RETRIES}`);
  console.log(`   • Browser pool: ${config.BROWSER_POOL_SIZE} instances`);
  console.log(`   • Images disabled: ${config.DISABLE_IMAGES ? '✅' : '❌'}`);
  console.log(`   • CSS disabled: ${config.DISABLE_CSS ? '✅' : '❌'}`);
  console.log(`   • Cleanup delay: ${Math.floor(config.JOB_CLEANUP_DELAY_MS / 60000)} minutes`);

  // Regenerate index.html asynchronously after server starts
  // eslint-disable-next-line no-undef
  setImmediate(async () => {
    console.log('🔄 Regenerating dashboard index.html...');
    try {
      await generateIndexHTML();
      console.log('✅ Dashboard index.html regenerated');
    } catch (error) {
      console.error('❌ Failed to regenerate index.html:', error.message);
    }
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await browserPool.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await browserPool.cleanup();
  process.exit(0);
});
