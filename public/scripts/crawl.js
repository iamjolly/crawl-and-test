// Crawl Page JavaScript - Job Management and Form Submission
/* global confirm, alert, FormData, URLSearchParams */

// Import date utilities for human-friendly formatting
import { formatDateTime, calculateDuration as calcDuration, extractDomainFromReportId, extractWcagInfo, formatRelativeTime } from './date-utils.js';

// Track previous job statuses to detect state changes
const previousJobStatuses = {};

// Cancel a job (called from inline onclick handlers in HTML)
// eslint-disable-next-line no-unused-vars
function cancelJob(jobId) {
    if (!confirm('Are you sure you want to cancel this job?')) {
        return;
    }

    fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateJobs();
            } else {
                alert('Failed to cancel job: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(err => {
            console.error('Error cancelling job:', err);
            alert('Error cancelling job. Please try again.');
        });
}

// Update jobs display
function updateJobs() {
    return fetch('/api/jobs')
        .then(response => response.json())
        .then(data => {
            const jobsList = document.getElementById('jobsList');
            const noJobsMessage = document.getElementById('noJobsMessage');

            // Preserve current focus before updating DOM
            const currentlyFocused = document.activeElement;
            const focusedJobId = currentlyFocused && currentlyFocused.classList.contains('job-item')
                ? currentlyFocused.id.replace('job-', '')
                : null;

            // Combine active and queued jobs
            const allJobs = [...(data.active || []), ...(data.queued || [])];

            if (allJobs.length === 0) {
                jobsList.innerHTML = '';
                noJobsMessage.style.display = 'block';
            } else {
                noJobsMessage.style.display = 'none';

                // Add stats header with resource warnings
                let statsHTML = '';
                if (data.stats) {
                    const isAtCapacity = data.stats.running >= data.stats.maxConcurrent;
                    const totalBrowsers = allJobs
                        .filter(job => job.status === 'running')
                        .reduce((sum, job) => sum + (job.crawlerConcurrency || 4), 0);

                    let warningHTML = '';
                    if (isAtCapacity && data.stats.totalQueued > 0) {
                        warningHTML += `<div class="resource-warning warning">⚠️ At maximum concurrency (${data.stats.maxConcurrent}). ${data.stats.totalQueued} job(s) queued.</div>`;
                    }
                    if (totalBrowsers >= 12) {
                        warningHTML += `<div class="resource-warning danger">🔥 High resource usage: ${totalBrowsers} total browser instances running!</div>`;
                    } else if (totalBrowsers >= 8) {
                        warningHTML += `<div class="resource-warning warning">⚠️ Moderate resource usage: ${totalBrowsers} browser instances running</div>`;
                    }

                    statsHTML = `
                        <div class="job-stats" style="padding: 1rem; background: #f5f5f5; border-radius: 4px; margin-bottom: 1rem;">
                            <strong>Job Queue Status:</strong>
                            ${data.stats.running}/${data.stats.maxConcurrent} running,
                            ${data.stats.totalQueued} queued
                            ${totalBrowsers > 0 ? `<br><strong>Browser Instances:</strong> ${totalBrowsers} active` : ''}
                            ${warningHTML}
                        </div>
                    `;
                }

                const jobsHTML = allJobs.map((job) => {
                    const startTime = job.startTime || job.createdTime;
                    const canCancel = job.status === 'running' || job.status === 'queued';
                    const cancelButton = canCancel ?
                        `<button class="btn-cancel" onclick="cancelJob('${job.jobId}')" aria-label="Cancel job for ${job.url}">
                            <span aria-hidden="true">✗</span>
                            <span class="sr-only">Cancel Job</span>
                        </button>` : '';

                    // Calculate runtime and estimated completion
                    let runtimeInfo = '';
                    if (job.status === 'running' && job.startTime) {
                        const runtime = Math.floor((new Date() - new Date(job.startTime)) / 1000);
                        const minutes = Math.floor(runtime / 60);
                        const seconds = runtime % 60;
                        runtimeInfo = ` • Runtime: ${minutes}m ${seconds}s`;

                        // Rough estimate based on 1-3 seconds per page
                        if (job.maxPages && job.maxPages > 0) {
                            const estimatedTotalSeconds = job.maxPages * 2; // 2 seconds per page estimate
                            if (runtime < estimatedTotalSeconds) {
                                const remainingSeconds = estimatedTotalSeconds - runtime;
                                const remainingMinutes = Math.floor(remainingSeconds / 60);
                                if (remainingMinutes > 0) {
                                    runtimeInfo += ` • Est. ${remainingMinutes}m remaining`;
                                }
                            }
                        }
                    } else if (job.endTime && job.startTime) {
                        const totalRuntime = Math.floor((new Date(job.endTime) - new Date(job.startTime)) / 1000);
                        const minutes = Math.floor(totalRuntime / 60);
                        const seconds = totalRuntime % 60;
                        runtimeInfo = ` • Completed in: ${minutes}m ${seconds}s`;
                    }

                    return `
                        <div class="job-item"
                             id="job-${job.jobId}"
                             tabindex="-1"
                             role="article"
                             aria-label="Crawl job for ${job.url}, status: ${job.status}">
                            <div class="job-info">
                                <div>
                                    <strong>${job.url}</strong>
                                    ${job.status === 'queued' ? '<span class="queue-indicator">(queued)</span>' : ''}
                                    <br>
                                    <small>
                                        ${job.status === 'queued' ? 'Created' : 'Started'} <time datetime="${startTime}" class="job-start-time">${formatRelativeTime(startTime)}</time>
                                        ${job.crawlerConcurrency ? ` • Concurrency: ${job.crawlerConcurrency}` : ''}
                                        ${job.maxPages ? ` • Max Pages: ${job.maxPages}` : ''}
                                        ${runtimeInfo}
                                    </small>
                                </div>
                                <div class="job-controls">
                                    <span class="job-status ${job.status}">${job.status}</span>
                                    ${cancelButton}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                jobsList.innerHTML = statsHTML + jobsHTML;

                // Detect status changes and announce/focus on completion or failure
                allJobs.forEach(job => {
                    const previousStatus = previousJobStatuses[job.jobId];
                    const currentStatus = job.status;

                    // If status changed from running/queued to completed or failed
                    if (previousStatus && previousStatus !== currentStatus) {
                        if (currentStatus === 'completed') {
                            // Announce completion
                            if (typeof announceToScreenReader === 'function') {
                                announceToScreenReader(`Crawl job for ${job.url} completed successfully. Report is ready to view.`);
                            }
                            // Reload completed jobs and focus the first report link
                            loadCompletedJobs().then(() => {
                                const firstReportLink = document.getElementById('first-completed-report-link');
                                if (firstReportLink) {
                                    firstReportLink.focus();
                                }
                            }).catch(err => console.error('Error reloading completed jobs:', err));
                        } else if (currentStatus === 'failed') {
                            // Announce failure
                            if (typeof announceToScreenReader === 'function') {
                                announceToScreenReader(`Crawl job for ${job.url} failed. Please check the error details.`, 'assertive');
                            }
                            // Focus the failed job
                            const jobElement = document.getElementById(`job-${job.jobId}`);
                            if (jobElement) {
                                jobElement.focus();
                            }
                        }
                    }

                    // Update status tracking
                    previousJobStatuses[job.jobId] = currentStatus;
                });

                // Restore focus if a job was previously focused and still exists
                // Only if no state change occurred (to avoid overriding completion focus)
                if (focusedJobId && !allJobs.some(job =>
                    previousJobStatuses[job.jobId] !== job.status &&
                    (job.status === 'completed' || job.status === 'failed')
                )) {
                    const jobStillExists = allJobs.find(job => job.jobId === focusedJobId);
                    if (jobStillExists) {
                        const restoredElement = document.getElementById(`job-${focusedJobId}`);
                        if (restoredElement) {
                            restoredElement.focus();
                        }
                    }
                }
            }
            return allJobs; // Return jobs for chaining
        })
        .catch(err => {
            console.error('Error fetching jobs:', err);
            throw err; // Re-throw to allow caller to handle
        });
}

// Load completed jobs from API
async function loadCompletedJobs() {
    try {
        const response = await fetch('/api/jobs/completed?limit=10');
        const data = await response.json();

        if (data.success && data.completedJobs && data.completedJobs.length > 0) {
            renderCompletedJobs(data.completedJobs);
        } else {
            // Hide completed section if no jobs
            const section = document.getElementById('completedJobsSection');
            if (section) {
                section.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading completed jobs:', error);
        // Hide section on error
        const section = document.getElementById('completedJobsSection');
        if (section) {
            section.style.display = 'none';
        }
    }
}

// Render completed jobs in the UI
function renderCompletedJobs(completedJobs) {
    const container = document.getElementById('completedJobsList');
    const section = document.getElementById('completedJobsSection');

    if (!container || !section) {
        return;
    }

    const html = completedJobs
        .map((job, index) => {
            // Extract clean domain name and WCAG info from report_id if available
            const domain = job.report_id ? extractDomainFromReportId(job.report_id) : new URL(job.url).hostname;
            const wcagInfo = job.report_id ? extractWcagInfo(job.report_id) : { version: job.wcag_version, level: job.wcag_level };

            // Format timestamps in user's local timezone
            const completedTime = formatDateTime(job.end_time);
            const duration = calcDuration(job.start_time, job.end_time);

            if (job.status === 'completed' && job.report_id) {
                return `
                <div class="completed-job-item" id="completed-job-${job.job_id}">
                    <div class="completed-job-info">
                        <div class="completed-job-domain">${domain}</div>
                        <div class="completed-job-meta">WCAG ${wcagInfo.version} Level ${wcagInfo.level}</div>
                        <div class="completed-job-timestamp">
                            <time datetime="${job.end_time}">Completed ${completedTime}</time>
                        </div>
                        <div class="completed-job-duration">Duration: ${duration}</div>
                    </div>
                    <div class="completed-job-actions">
                        <a href="/api/reports/by-job/${job.job_id}"
                           class="btn btn-sm btn-primary"
                           ${index === 0 ? 'id="first-completed-report-link"' : ''}
                           aria-label="View accessibility report for ${domain}">
                            View Report →
                        </a>
                    </div>
                </div>
            `;
            } else if (job.status === 'failed') {
                const failedTime = formatDateTime(job.end_time);
                return `
                <div class="completed-job-item completed-job-item--failed" id="completed-job-${job.job_id}">
                    <div class="completed-job-info">
                        <div class="completed-job-domain">${domain}</div>
                        <div class="completed-job-meta">WCAG ${wcagInfo.version} Level ${wcagInfo.level}</div>
                        <div class="completed-job-timestamp">
                            <time datetime="${job.end_time}">Failed ${failedTime}</time>
                        </div>
                        ${job.error_message ? `<div class="completed-job-error">${job.error_message}</div>` : ''}
                    </div>
                </div>
            `;
            }
            return '';
        })
        .join('');

    container.innerHTML = html;
    section.style.display = 'block';
}

// Enhanced URL validation and formatting
function normalizeUrl(url) {
    if (!url) return '';

    // Remove whitespace and common formatting issues
    const trimmedUrl = url.trim().replace(/\s+/g, '');
    const lowerUrl = trimmedUrl.toLowerCase();

    // If no protocol, add appropriate protocol
    if (lowerUrl && !lowerUrl.match(/^https?:\/\//i)) {
        // Use http:// for localhost, https:// for everything else
        if (lowerUrl.startsWith('localhost')) {
            return 'http://' + lowerUrl;
        } else {
            return 'https://' + lowerUrl;
        }
    }

    return lowerUrl;
}

// Enhanced URL validation with comprehensive checks (unused but kept for future use)
// eslint-disable-next-line no-unused-vars
function isValidUrl(url) {
    if (!url) return false;

    try {
        const normalizedUrl = normalizeUrl(url);
        const urlObj = new URL(normalizedUrl);

        // Check protocol
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return false;
        }

        // Check hostname exists and is valid
        if (!urlObj.hostname || urlObj.hostname.length === 0) {
            return false;
        }

        const hostname = urlObj.hostname;

        // Special case: localhost is always valid
        if (hostname === 'localhost') {
            return true;
        }

        // Check if it's a valid IP address
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipPattern.test(hostname)) {
            const parts = hostname.split('.').map(Number);
            return parts.every(part => part >= 0 && part <= 255);
        }

        // For domain names, must contain at least one dot
        if (!hostname.includes('.')) {
            return false;
        }

        // Check for valid domain characters
        const domainPattern = /^[a-zA-Z0-9.-]+$/;
        if (!domainPattern.test(hostname)) {
            return false;
        }

        // Check for valid domain structure
        const parts = hostname.split('.');

        // Must have at least 2 parts (domain + TLD)
        if (parts.length < 2) {
            return false;
        }

        // Each part must be valid
        for (const part of parts) {
            if (part.length === 0) {
                return false;
            }
            if (part.startsWith('-') || part.endsWith('-')) {
                return false;
            }
        }

        // TLD must be at least 2 characters and contain only letters
        const tld = parts[parts.length - 1];
        if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

// Get detailed validation feedback for user
function getUrlValidationMessage(url) {
    if (!url || url.trim() === '') {
        return { isValid: false, message: 'Website URL is required' };
    }

    const normalizedUrl = normalizeUrl(url);

    try {
        const urlObj = new URL(normalizedUrl);

        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return { isValid: false, message: 'URL must use http:// or https:// protocol' };
        }

        if (!urlObj.hostname) {
            return { isValid: false, message: 'URL must include a valid domain name' };
        }

        const hostname = urlObj.hostname;

        // Special case: localhost
        if (hostname === 'localhost') {
            return { isValid: true, message: 'Valid URL' };
        }

        // Check if it's an IP address
        const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipPattern.test(hostname)) {
            const parts = hostname.split('.').map(Number);
            if (parts.every(part => part >= 0 && part <= 255)) {
                return { isValid: true, message: 'Valid URL' };
            } else {
                return { isValid: false, message: 'Invalid IP address format' };
            }
        }

        // Domain validation
        if (!hostname.includes('.')) {
            return { isValid: false, message: 'Domain must include a top-level domain (e.g., .com, .org)' };
        }

        const domainPattern = /^[a-zA-Z0-9.-]+$/;
        if (!domainPattern.test(hostname)) {
            return { isValid: false, message: 'Domain contains invalid characters. Use only letters, numbers, hyphens, and dots.' };
        }

        const parts = hostname.split('.');

        if (parts.length < 2) {
            return { isValid: false, message: 'Please enter a complete domain name (e.g., example.com)' };
        }

        for (const part of parts) {
            if (part.length === 0) {
                return { isValid: false, message: 'Invalid domain format - check for double dots or missing parts' };
            }
            if (part.startsWith('-') || part.endsWith('-')) {
                return { isValid: false, message: 'Domain parts cannot start or end with hyphens' };
            }
        }

        const tld = parts[parts.length - 1];
        if (tld.length < 2) {
            return { isValid: false, message: 'Top-level domain must be at least 2 characters long' };
        }

        if (!/^[a-zA-Z]+$/.test(tld)) {
            return { isValid: false, message: 'Top-level domain must contain only letters' };
        }

        return { isValid: true, message: 'Valid URL' };

    } catch {
        return { isValid: false, message: 'Please enter a valid URL format (e.g., example.com)' };
    }
}

// Enhanced accessible URL validation
function validateUrlField() {
    const urlField = document.getElementById('url');
    const errorElement = document.getElementById('url-error');
    const validation = getUrlValidationMessage(urlField.value);

    if (!validation.isValid && urlField.value.trim()) {
        // Show error state
        errorElement.textContent = validation.message;
        errorElement.style.display = 'block';
        urlField.setAttribute('aria-invalid', 'true');
        urlField.classList.add('is-invalid');
        errorElement.focus();
        return false;
    } else {
        // Clear error state
        errorElement.style.display = 'none';
        urlField.removeAttribute('aria-invalid');
        urlField.classList.remove('is-invalid');
        return true;
    }
}

// Utility function to show in-page alerts
function showAlert(title, message, type = 'info') {
    const alert = document.getElementById('crawl-alert');
    const alertTitle = document.getElementById('alert-title');
    const alertMessage = document.getElementById('alert-message');
    const alertClose = document.getElementById('alert-close');

    if (!alert || !alertTitle || !alertMessage || !alertClose) {
        console.error('Alert component elements not found');
        return;
    }

    // Remove any existing type classes
    alert.classList.remove('alert--success', 'alert--error', 'alert--info');

    // Add the appropriate type class
    alert.classList.add(`alert--${type}`);

    // Set the content
    alertTitle.textContent = title;
    alertMessage.textContent = message;

    // Show the alert
    alert.style.display = 'flex';

    // Setup close button handler (remove any existing listeners first)
    const newCloseBtn = alertClose.cloneNode(true);
    alertClose.parentNode.replaceChild(newCloseBtn, alertClose);
    newCloseBtn.addEventListener('click', () => {
        alert.style.display = 'none';
    });

    // Scroll to alert if it's not in view
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Announce to screen readers using global announcer
    const fullMessage = `${title}: ${message}`;
    const priority = type === 'error' ? 'assertive' : 'polite';
    if (typeof announceToScreenReader === 'function') {
        announceToScreenReader(fullMessage, priority);
    }
}

// Utility function for screen reader announcements
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = message;
    announcement.className = 'sr-only';
    announcement.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    `;

    document.body.appendChild(announcement);
    setTimeout(() => {
        if (announcement.parentElement) {
            document.body.removeChild(announcement);
        }
    }, 1000);
}

// Initialize form validation
document.addEventListener('DOMContentLoaded', function() {
    const urlField = document.getElementById('url');
    const crawlForm = document.getElementById('crawl-form');

    // Validate on blur (when user leaves field)
    urlField.addEventListener('blur', function() {
        if (this.value.trim()) {
            const normalizedUrl = normalizeUrl(this.value);
            if (normalizedUrl !== this.value) {
                this.value = normalizedUrl;
            }
            validateUrlField();
        }
    });

    // Enhanced form submission with comprehensive validation
    crawlForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');

        // Perform comprehensive validation before submission
        const validation = getUrlValidationMessage(urlField.value);

        if (!validation.isValid) {
            validateUrlField();
            urlField.focus();

            const errorElement = document.getElementById('url-error');
            if (errorElement) {
                errorElement.setAttribute('aria-live', 'assertive');
                setTimeout(() => {
                    errorElement.setAttribute('aria-live', 'polite');
                }, 1000);
            }
            return;
        }

        // Normalize URL and proceed with submission
        const normalizedUrl = normalizeUrl(urlField.value);
        urlField.value = normalizedUrl;
        formData.set('url', normalizedUrl);

        // Disable form and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Starting Crawl...';

        // Disable all form inputs during submission
        const allInputs = this.querySelectorAll('input, select, button');
        allInputs.forEach(input => input.disabled = true);

        // Convert FormData to URLSearchParams for proper server parsing
        const params = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            params.append(key, value);
        }

        fetch('/crawl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Crawl Started', `Crawl started successfully! Job ID: ${data.jobId}`, 'success');

                // Reset form to clean state
                this.reset();
                validateUrlField();

                // Update jobs list (focus is no longer needed here - alert handles announcement)
                updateJobs()
                    .catch(err => {
                        console.error('Error updating jobs after submission:', err);
                    });
            } else {
                showAlert('Error', `Error starting crawl: ${data.error || 'Unknown error'}`, 'error');
            }
        })
        .catch(err => {
            showAlert('Error', `Failed to start crawl: ${err.message || 'Network error'}`, 'error');
            console.error('Crawl submission error:', err);
        })
        .finally(() => {
            // Re-enable form regardless of success or failure
            const allInputs = this.querySelectorAll('input, select, button');
            allInputs.forEach(input => input.disabled = false);

            submitBtn.textContent = 'Start Crawl';
        });
    });

    // Dynamic polling based on job activity
    let currentPollInterval = null;

    function startPolling() {
        if (currentPollInterval) {
            clearInterval(currentPollInterval);
        }

        const pollFunction = () => {
            updateJobs()
                .then(jobs => {
                    const hasActiveJobs = jobs.some(job => job.status === 'running' || job.status === 'queued');
                    const newInterval = hasActiveJobs ? 2000 : 10000;

                    if (!currentPollInterval || currentPollInterval._interval !== newInterval) {
                        if (currentPollInterval) {
                            clearInterval(currentPollInterval);
                        }
                        currentPollInterval = setInterval(pollFunction, newInterval);
                        currentPollInterval._interval = newInterval;
                    }
                })
                .catch(err => console.error('Error in periodic job update:', err));
        };

        currentPollInterval = setInterval(pollFunction, 2000);
        currentPollInterval._interval = 2000;
    }

    startPolling();

    // Update relative timestamps every minute
    function updateRelativeTimestamps() {
        const timeElements = document.querySelectorAll('.job-start-time');
        timeElements.forEach(timeEl => {
            const datetime = timeEl.getAttribute('datetime');
            if (datetime) {
                timeEl.textContent = formatRelativeTime(datetime);
            }
        });
    }

    // Update relative times every 60 seconds
    setInterval(updateRelativeTimestamps, 60000);

    // Initial load
    updateJobs().catch(err => console.error('Error in initial job load:', err));
    loadCompletedJobs().catch(err => console.error('Error in initial completed jobs load:', err));
});
