/**
 * Global Screen Reader Announcer Utility
 *
 * Provides a centralized way to announce dynamic content updates to screen readers
 * across the entire CATS application.
 *
 * Usage:
 *   announceToScreenReader('5 users found');
 *   announceToScreenReader('Error: Unable to save changes', 'assertive');
 *
 * @module announcer
 */

/**
 * Announces a message to screen readers via the global ARIA live region
 *
 * @param {string} message - The message to announce to screen readers
 * @param {string} [priority='polite'] - Announcement priority: 'polite' or 'assertive'
 *   - 'polite': Waits for current speech to finish (default, for non-urgent updates)
 *   - 'assertive': Interrupts current speech (use sparingly, for urgent messages only)
 *
 * @example
 * // Announce a successful action
 * announceToScreenReader('Report deleted successfully');
 *
 * @example
 * // Announce an urgent error
 * announceToScreenReader('Error: Connection lost', 'assertive');
 */
// eslint-disable-next-line no-unused-vars
function announceToScreenReader(message, priority = 'polite') {
  const announcer = document.getElementById('sr-announcer');

  if (!announcer) {
    // eslint-disable-next-line no-console
    console.warn('[Announcer] Screen reader announcer element (#sr-announcer) not found');
    return;
  }

  // Validate priority parameter
  if (priority !== 'polite' && priority !== 'assertive') {
    // eslint-disable-next-line no-console
    console.warn(`[Announcer] Invalid priority "${priority}". Using "polite" instead.`);
    priority = 'polite';
  }

  // Set the announcement priority
  announcer.setAttribute('aria-live', priority);

  // Clear the previous message to ensure screen readers detect the change
  announcer.textContent = '';

  // Small delay to ensure screen readers detect the content change
  // This is a workaround for some screen readers that may not detect rapid changes
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}
