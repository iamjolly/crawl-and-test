/**
 * Accessibility Report Utilities
 * Common utility functions for the accessibility reports
 */

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) {
    return '';
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format timestamp for display
function formatTimestamp(timestamp) {
  if (!timestamp) {
    return new Date().toLocaleString();
  }

  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (e) {
    return timestamp;
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return 'Unknown';
  }
}

// Generate unique ID for elements
function generateId(prefix = 'element') {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Copy text to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// Show notification to user
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'polite');
  notification.textContent = message;

  // Style the notification
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 4px;
        color: white;
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);

  // Remove after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Add loading state to button
function setButtonLoading(button, loading = true) {
  if (loading) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.dataset.originalText = button.textContent;
    button.textContent = '⏳ Loading...';
  } else {
    button.disabled = false;
    button.setAttribute('aria-busy', 'false');
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

// Parse timestamp from report filename and format for display
function parseTimestampFromFilename(filename) {
  // Handle multiple timestamp formats in filenames
  const reportDate = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(?:-\d{3}Z|-\d{3})?)/);

  if (!reportDate) {
    return 'Unknown';
  }

  // Convert filename timestamp format to ISO format
  let isoTimestamp = reportDate[1];

  // Handle format with milliseconds: 2025-09-16T18-42-30-245Z or similar
  if (isoTimestamp.match(/-\d{3}Z?$/)) {
    isoTimestamp = isoTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})(Z?)/, 'T$1:$2:$3.$4$5');
  } else {
    // Handle standard format: 2025-09-14T11-35-12
    isoTimestamp = isoTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
  }

  return formatTimestamp(isoTimestamp);
}

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    formatTimestamp,
    extractDomain,
    generateId,
    debounce,
    copyToClipboard,
    showNotification,
    setButtonLoading,
    parseTimestampFromFilename,
  };
}
