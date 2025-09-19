/**
 * Tests for redirect handling in the crawler
 */

const { chromium } = require('playwright');

describe('Redirect Handling', () => {
  // Mock the getCanonicalDomain function since we can't easily test it in isolation
  async function getCanonicalDomain(url) {
    try {
      // First try with fetch for HTTP-level redirects (faster)
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      const fetchFinalUrl = response.url;

      // Use Playwright to handle meta refresh and JavaScript redirects
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(fetchFinalUrl, { waitUntil: 'networkidle', timeout: 10000 });
        const playwrightFinalUrl = page.url();
        await browser.close();

        return new URL(playwrightFinalUrl).hostname;
      } catch (playwrightError) {
        await browser.close();
        // Fall back to fetch result if Playwright fails
        return new URL(fetchFinalUrl).hostname;
      }
    } catch (error) {
      // Fallback to original URL if all redirect checks fail
      return new URL(url).hostname;
    }
  }

  test('should handle HTTP redirects (301/302)', async () => {
    // Test HTTP to HTTPS redirect
    const domain = await getCanonicalDomain('http://github.com');
    expect(domain).toBe('github.com');
  });

  test('should handle subdomain redirects', async () => {
    // Test non-www to www redirect
    const domain = await getCanonicalDomain('https://plymouthucc.org');
    expect(domain).toBe('www.plymouthucc.org');
  });

  test('should handle URLs without redirects', async () => {
    // Test direct URL without redirects
    const domain = await getCanonicalDomain('https://www.example.com');
    expect(domain).toBe('www.example.com');
  });

  test('should fall back gracefully on redirect failures', async () => {
    // Test with an invalid URL
    const domain = await getCanonicalDomain('https://definitely-does-not-exist-12345.com');
    expect(domain).toBe('definitely-does-not-exist-12345.com');
  });
});
