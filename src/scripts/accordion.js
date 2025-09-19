/**
 * Accessibility Report Accordion Functionality
 * Manages the expand/collapse behavior of report sections
 */

// Accessible accordion functionality
function toggleAccordion(contentId, headerId) {
  const content = document.getElementById(contentId);
  const header = document.getElementById(headerId);
  const accordionItem = header.closest('.accordion-item');
  const isExpanded = header.getAttribute('aria-expanded') === 'true';

  // Toggle the content visibility
  if (isExpanded) {
    content.classList.remove('expanded');
    accordionItem.classList.remove('expanded');
    header.setAttribute('aria-expanded', 'false');
  } else {
    content.classList.add('expanded');
    accordionItem.classList.add('expanded');
    header.setAttribute('aria-expanded', 'true');
  }
}

// Expand all accordion sections
function expandAll() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    const contentId = header.getAttribute('aria-controls');
    const content = document.getElementById(contentId);
    const accordionItem = header.closest('.accordion-item');
    const isExpanded = header.getAttribute('aria-expanded') === 'true';

    if (!isExpanded) {
      content.classList.add('expanded');
      accordionItem.classList.add('expanded');
      header.setAttribute('aria-expanded', 'true');
    }
  });
}

// Collapse all accordion sections
function collapseAll() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    const contentId = header.getAttribute('aria-controls');
    const content = document.getElementById(contentId);
    const accordionItem = header.closest('.accordion-item');
    const isExpanded = header.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      content.classList.remove('expanded');
      accordionItem.classList.remove('expanded');
      header.setAttribute('aria-expanded', 'false');
    }
  });
}

// Auto-expand pages with issues on load for better UX
function autoExpandIssues() {
  const headers = document.querySelectorAll('.accordion-header');
  headers.forEach(header => {
    const pageStats = header.querySelector('.page-stats');
    const hasIssues =
      pageStats &&
      (pageStats.querySelector('.stat-violations') || pageStats.querySelector('.stat-warnings'));

    // Auto-expand pages with violations or warnings
    if (hasIssues) {
      const contentId = header.getAttribute('aria-controls');
      const headerId = header.getAttribute('id');
      toggleAccordion(contentId, headerId);
    }
  });
}

// Initialize accordion functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  autoExpandIssues();

  // Add keyboard event listeners for better accessibility
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('keydown', function (event) {
      // Support Enter and Space keys
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        header.click();
      }
    });
  });
});

// Export functions for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toggleAccordion,
    expandAll,
    collapseAll,
    autoExpandIssues,
  };
}
