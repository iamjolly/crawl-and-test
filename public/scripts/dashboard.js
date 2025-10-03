// Dashboard Overview JavaScript

// Update statistics
function updateStats() {
    Promise.all([
        fetch('/api/reports').then(res => res.json()),
        fetch('/api/jobs').then(res => res.json())
    ])
    .then(([reports, jobsData]) => {
        // Total reports
        const totalReports = reports.reduce((sum, dir) => sum + dir.reportCount, 0);
        document.getElementById('total-reports').textContent = totalReports;

        // Active jobs
        const activeJobs = jobsData.stats ? jobsData.stats.running : 0;
        document.getElementById('active-jobs').textContent = activeJobs;

        // Domains tested
        const domainCount = reports.length;
        document.getElementById('domains-tested').textContent = domainCount;

        // Queue status
        const queueStatus = jobsData.stats
            ? `${jobsData.stats.running}/${jobsData.stats.maxConcurrent}`
            : '--';
        document.getElementById('queue-status').textContent = queueStatus;

        // Update recent activity
        updateRecentActivity(jobsData.active || [], reports);
    })
    .catch(err => {
        console.error('Error updating stats:', err);
    });
}

// Update recent activity feed
function updateRecentActivity(jobs, reports) {
    const activityList = document.getElementById('activity-list');

    if (jobs.length === 0 && reports.length === 0) {
        activityList.innerHTML = '<p class="no-reports">No recent activity</p>';
        return;
    }

    // Combine jobs and recent reports into activity items
    const activities = [];

    // Add recent jobs
    jobs.slice(0, 5).forEach(job => {
        activities.push({
            type: 'job',
            title: `Crawling ${job.url}`,
            meta: `Started ${new Date(job.startTime || job.createdTime).toLocaleString()}`,
            status: job.status,
            timestamp: new Date(job.startTime || job.createdTime)
        });
    });

    // Add recent reports (mock - in real implementation, reports would have timestamps)
    reports.slice(0, 5).forEach(report => {
        if (report.lastReport) {
            activities.push({
                type: 'report',
                title: `Report generated for ${report.domain}`,
                meta: `${report.reportCount} report(s) available`,
                status: 'success',
                timestamp: new Date() // Placeholder - should come from actual report data
            });
        }
    });

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Render activity items
    const activityHTML = activities.slice(0, 10).map(activity => {
        const badgeClass = activity.status === 'running' ? 'running'
            : activity.status === 'error' ? 'error'
            : 'success';

        const badgeText = activity.status === 'running' ? 'In Progress'
            : activity.status === 'error' ? 'Failed'
            : 'Completed';

        return `
            <div class="activity-item">
                <div class="activity-item__content">
                    <div class="activity-item__title">${activity.title}</div>
                    <div class="activity-item__meta">${activity.meta}</div>
                </div>
                <span class="activity-item__badge ${badgeClass}">${badgeText}</span>
            </div>
        `;
    }).join('');

    activityList.innerHTML = activityHTML;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initial load
    updateStats();

    // Refresh every 10 seconds
    setInterval(updateStats, 10000);
});
