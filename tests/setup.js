/**
 * Jest setup file
 * Global test configuration and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CATS_SERVER_PORT = '3001';
process.env.CATS_REPORTS_DIR = './tests/fixtures/reports';

// Global test timeout (30 seconds for accessibility scans)
jest.setTimeout(30000);

// Mock console methods in tests to avoid noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  /**
   * Create a mock URL for testing
   * @param {string} domain - Domain name
   * @param {string} path - URL path
   * @returns {string} Full URL
   */
  createMockUrl: (domain = 'example.com', path = '') => {
    return `https://${domain}${path}`;
  },

  /**
   * Create mock accessibility violation
   * @param {string} ruleId - Rule ID
   * @param {string} impact - Impact level
   * @returns {object} Mock violation
   */
  createMockViolation: (ruleId = 'color-contrast', impact = 'serious') => ({
    id: ruleId,
    impact,
    description: `Mock violation for ${ruleId}`,
    nodes: [
      {
        target: ['#mock-element'],
        html: '<div id="mock-element">Mock content</div>',
        failureSummary: 'Mock failure summary',
      },
    ],
  }),

  /**
   * Create mock axe results
   * @param {number} violationCount - Number of violations
   * @returns {object} Mock axe results
   */
  createMockAxeResults: (violationCount = 1) => ({
    url: 'https://example.com',
    timestamp: new Date().toISOString(),
    violations: Array(violationCount)
      .fill(null)
      .map((_, i) => global.testUtils.createMockViolation(`rule-${i}`, 'serious')),
    passes: [],
    incomplete: [],
    inapplicable: [],
  }),
};
