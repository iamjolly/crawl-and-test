const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const config = require('../core/config');
const { generateIndexHTML } = require('../generators/index');
const { parseTimestampFromFilename } = require('../scripts/utils');

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

  // Start the job
  startJobProcess(jobId, jobData);
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

  // Process queue after cleanup
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
  crawlProcess.on('close', code => {
    const currentJob = activeJobs.get(jobId);
    if (currentJob) {
      currentJob.status = code === 0 ? JOB_STATUS.COMPLETED : JOB_STATUS.ERROR;
      currentJob.endTime = new Date().toISOString();

      // Regenerate index.html if crawl was successful
      if (code === 0) {
        try {
          generateIndexHTML();
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

// Generate reports list HTML for reports index page
function generateReportsListHTML() {
  const reportDirs = getReportDirectories();

  if (reportDirs.length === 0) {
    return '<p class="no-reports">No reports generated yet. Start a crawl to create your first report!</p>';
  }

  return reportDirs
    .map(dir => {
      const dirPath = path.join(config.REPORTS_DIR, dir.domain);
      const files = fs.readdirSync(dirPath);
      const reports = files.filter(file => file.endsWith('.html'));

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
function generateDomainReportsListHTML(domain) {
  const domainDir = path.join(config.REPORTS_DIR, domain);
  const files = fs.readdirSync(domainDir);
  const reports = files.filter(file => file.endsWith('.html'));

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
}

// Generate reports index HTML using template
function generateReportsIndexHTML() {
  const template = loadTemplate('reports-index');
  const reportsList = generateReportsListHTML();

  return renderTemplate(template, {
    reportsList,
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
    reportsList,
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
      errorMessage: `No reports found for domain: ${domain}`,
    });
    return res.status(404).send(errorHTML);
  }

  res.send(generateDomainReportsHTML(domain));
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
  });
});

// API endpoint to get current reports
app.get('/api/reports', (req, res) => {
  const reportDirs = getReportDirectories();
  res.json(reportDirs);
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

  // Store job info
  activeJobs.set(jobId, jobData);

  if (canStartNewJob()) {
    // Start immediately
    startJobProcess(jobId, jobData);
    console.log(`🚀 Job ${jobId} started immediately`);
  } else {
    // Add to queue
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
  return res
    .status(400)
    .json({
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
  console.log(`   • Cleanup delay: ${Math.floor(config.JOB_CLEANUP_DELAY_MS / 60000)} minutes`);

  // Always regenerate index.html on server startup
  console.log('🔄 Regenerating dashboard index.html...');
  generateIndexHTML();
  console.log('✅ Dashboard index.html regenerated');
});
