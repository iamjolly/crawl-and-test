/**
 * Date and time formatting utilities
 * Provides consistent, user-friendly date/time formatting across the application
 */

/**
 * Format an ISO date string to a full human-readable format
 * Example: "Friday, Oct. 10, 2025 at 4:15 PM MDT"
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Formatted date and time
 */
export function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format an ISO date string to just the date portion
 * Example: "Oct. 10, 2025"
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Formatted date
 */
export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format an ISO date string to just the time portion
 * Example: "4:15 PM MDT"
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Formatted time
 */
export function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format a time as relative to now (e.g., "5 minutes ago")
 * Falls back to formatted date for items older than 24 hours
 * @param {string} isoString - ISO 8601 date string
 * @returns {string} Relative time or formatted date
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  // Fall back to formatted date for older items
  return formatDate(isoString);
}

/**
 * Format a duration in seconds to a human-readable string
 * Example: "2m 15s" or "1h 23m"
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Calculate duration between two ISO date strings
 * @param {string} startIso - Start time ISO string
 * @param {string} endIso - End time ISO string
 * @returns {string} Formatted duration
 */
export function calculateDuration(startIso, endIso) {
  if (!startIso || !endIso) return '';
  const start = new Date(startIso);
  const end = new Date(endIso);
  const seconds = Math.floor((end - start) / 1000);
  return formatDuration(seconds);
}

/**
 * Extract a clean domain name from a report ID
 * Example: "cnn.com_wcag2.1_AA_2025-10-10T22-03-58" -> "cnn.com"
 * @param {string} reportId - Report ID or filename
 * @returns {string} Domain name
 */
export function extractDomainFromReportId(reportId) {
  if (!reportId) return '';
  // Extract everything before the first _wcag
  const match = reportId.match(/^(.+?)_wcag/);
  return match ? match[1] : reportId;
}

/**
 * Extract WCAG version and level from report ID
 * Example: "cnn.com_wcag2.1_AA_2025-10-10T22-03-58" -> { version: "2.1", level: "AA" }
 * @param {string} reportId - Report ID or filename
 * @returns {{version: string, level: string}} WCAG version and level
 */
export function extractWcagInfo(reportId) {
  if (!reportId) return { version: '', level: '' };
  const match = reportId.match(/wcag(\d+\.\d+)_([A-Z]+)/);
  return match
    ? { version: match[1], level: match[2] }
    : { version: '', level: '' };
}

/**
 * Create a semantic HTML time element with both machine and human-readable formats
 * @param {string} isoString - ISO 8601 date string
 * @param {string} humanReadable - Human-readable formatted string
 * @returns {string} HTML time element
 */
export function createTimeElement(isoString, humanReadable) {
  if (!isoString) return '';
  return `<time datetime="${isoString}">${humanReadable || formatDateTime(isoString)}</time>`;
}
