/**
 * Browser Pool Manager for CATS
 *
 * Manages a pool of Playwright browser instances to improve performance
 * in Cloud Run environments by reusing browsers instead of launching new ones
 * for each page scan.
 */

const { chromium } = require('playwright');
const config = require('../core/config');

class BrowserPool {
  constructor() {
    this.pool = [];
    this.maxPoolSize = config.BROWSER_POOL_SIZE;
    this.activeConnections = 0;
    this.maxConnections = config.BROWSER_POOL_SIZE * 5; // Allow more contexts than browsers
    this.memoryLimitMB = config.BROWSER_MEMORY_LIMIT_MB;
  }

  /**
   * Get optimized browser launch arguments for Cloud Run
   */
  getBrowserLaunchArgs() {
    const baseArgs = [
      '--headless=new', // Use new headless mode
      '--no-sandbox', // Required for Cloud Run
      '--disable-dev-shm-usage', // Use /tmp instead of /dev/shm
      '--disable-extensions',
      '--disable-plugins',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ];

    // Cloud Run specific optimizations
    if (config.IS_CLOUD_RUN) {
      baseArgs.push(
        '--memory-pressure-off', // Disable memory pressure signals
        '--max_old_space_size=' + this.memoryLimitMB, // Set V8 memory limit
        '--disable-features=TranslateUI', // Reduce memory usage
        '--disable-ipc-flooding-protection' // Improve performance
      );
    }

    // Performance optimizations based on config
    if (config.DISABLE_IMAGES) {
      baseArgs.push('--blink-settings=imagesEnabled=false');
    }

    return baseArgs;
  }

  /**
   * Get optimized context options
   */
  getContextOptions() {
    const options = {
      viewport: { width: 1280, height: 720 }, // Standard desktop size
      userAgent:
        'Mozilla/5.0 (compatible; CATS-Crawler/1.0; +https://github.com/iamjolly/crawl-and-test)',
      ignoreHTTPSErrors: true, // Handle self-signed certificates
      reducedMotion: 'reduce', // Improve performance
    };

    // No route blocking here - we'll set it up on the context after creation

    return options;
  }

  /**
   * Launch a new browser instance
   */
  async launchBrowser() {
    console.log(
      `🚀 Launching new browser instance (pool size: ${this.pool.length}/${this.maxPoolSize})`
    );

    try {
      const browser = await chromium.launch({
        headless: true,
        args: this.getBrowserLaunchArgs(),
        timeout: 30000, // 30 second launch timeout
      });

      // Track memory usage
      browser._startTime = Date.now();
      browser._pageCount = 0;

      return browser;
    } catch (error) {
      console.error('❌ Failed to launch browser:', error.message);
      throw error;
    }
  }

  /**
   * Get a browser from the pool or create a new one
   */
  async getBrowser() {
    // Try to get an existing browser from pool
    if (this.pool.length > 0) {
      const browser = this.pool.pop();

      // Check if browser is still connected
      try {
        await browser.version(); // Test connection
        browser._pageCount = (browser._pageCount || 0) + 1;
        return browser;
      } catch {
        console.warn('⚠️  Browser disconnected, launching new one');
        try {
          await browser.close();
        } catch {
          // Ignore close errors
        }
      }
    }

    // Launch new browser if pool is empty or browsers are disconnected
    return await this.launchBrowser();
  }

  /**
   * Return a browser to the pool or close it if pool is full
   */
  async returnBrowser(browser) {
    if (!browser) return;

    try {
      // Check browser health and memory usage
      const runtime = Date.now() - (browser._startTime || 0);
      const pageCount = browser._pageCount || 0;

      // Close browser if it's been running too long or processed too many pages
      const shouldClose =
        this.pool.length >= this.maxPoolSize ||
        runtime > 600000 || // 10 minutes
        pageCount > 50; // 50 pages

      if (shouldClose) {
        console.log(
          `🗑️  Closing browser (runtime: ${Math.floor(runtime / 1000)}s, pages: ${pageCount})`
        );
        await browser.close();
        return;
      }

      // Return healthy browser to pool
      this.pool.push(browser);
    } catch (error) {
      console.warn('⚠️  Error returning browser to pool:', error.message);
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }
  }

  /**
   * Create a new browser context with optimized settings
   */
  async createContext(browser) {
    this.activeConnections++;

    try {
      const context = await browser.newContext(this.getContextOptions());

      // Set up resource filtering for performance
      if (config.DISABLE_IMAGES || config.DISABLE_CSS) {
        await context.route('**/*', (route, request) => {
          const resourceType = request.resourceType();

          if (config.DISABLE_IMAGES && resourceType === 'image') {
            route.abort();
            return;
          }

          if (config.DISABLE_CSS && resourceType === 'stylesheet') {
            route.abort();
            return;
          }

          // Block unnecessary resources for accessibility scanning
          if (['font', 'media', 'websocket'].includes(resourceType)) {
            route.abort();
            return;
          }

          route.continue();
        });
      }

      // Set up context cleanup
      const originalClose = context.close.bind(context);
      context.close = async () => {
        this.activeConnections--;
        return originalClose();
      };

      return context;
    } catch (error) {
      this.activeConnections--;
      throw error;
    }
  }

  /**
   * Clean up all browsers in the pool
   */
  async cleanup() {
    console.log(`🧹 Cleaning up browser pool (${this.pool.length} browsers)`);

    const closePromises = this.pool.map(async browser => {
      try {
        await browser.close();
      } catch (error) {
        console.warn('⚠️  Error closing browser:', error.message);
      }
    });

    await Promise.allSettled(closePromises);
    this.pool = [];
    this.activeConnections = 0;
  }

  /**
   * Get pool status for monitoring
   */
  getStatus() {
    return {
      poolSize: this.pool.length,
      maxPoolSize: this.maxPoolSize,
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
    };
  }
}

// Export singleton instance
module.exports = new BrowserPool();
