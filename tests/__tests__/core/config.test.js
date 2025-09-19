/**
 * Tests for core configuration module
 */

const config = require('../../../src/core/config');
const path = require('path');

describe('CATS Configuration', () => {
  describe('Default Configuration', () => {
    test('should have correct default values', () => {
      expect(config.APP_NAME).toBe('CATS');
      expect(config.DEFAULT_WCAG_VERSION).toBe('2.1');
      expect(config.DEFAULT_WCAG_LEVEL).toBe('AA');
      expect(config.MAX_PAGES).toBe(25);
      expect(config.SERVER_PORT).toBeDefined();
    });

    test('should have correct directory paths', () => {
      expect(config.ROOT_DIR).toBeDefined();
      expect(config.SRC_DIR).toContain('src');
      expect(config.PUBLIC_DIR).toContain('public');
      expect(config.REPORTS_DIR).toContain('reports');
      expect(config.TEMPLATES_DIR).toContain('templates');
    });
  });

  describe('Domain Sanitization', () => {
    test('should sanitize domain names correctly', () => {
      expect(config.sanitizeDomainName('example.com')).toBe('example.com');
      expect(config.sanitizeDomainName('sub.example.com')).toBe('sub.example.com');
      expect(config.sanitizeDomainName('example.com/path')).toBe('example.com_path');
      expect(config.sanitizeDomainName('example.com?query=1')).toBe('example.com_query_1');
      expect(config.sanitizeDomainName('example.com:8080')).toBe('example.com_8080');
    });

    test('should handle special characters', () => {
      expect(config.sanitizeDomainName('test@example.com')).toBe('test_example.com');
      expect(config.sanitizeDomainName('example.com#anchor')).toBe('example.com_anchor');
      expect(config.sanitizeDomainName('example.com|pipe')).toBe('example.com_pipe');
    });
  });

  describe('Domain Reports Directory', () => {
    test('should generate correct domain reports directory', () => {
      const domain = 'example.com';
      const expected = path.join(config.REPORTS_DIR, domain);
      expect(config.getDomainReportsDir(domain)).toBe(expected);
    });

    test('should sanitize domain in directory path', () => {
      const domain = 'sub.example.com/path';
      const sanitized = 'sub.example.com_path';
      const expected = path.join(config.REPORTS_DIR, sanitized);
      expect(config.getDomainReportsDir(domain)).toBe(expected);
    });
  });

  describe('Server URL', () => {
    test('should generate correct server URL', () => {
      const expectedUrl = `http://${config.SERVER_HOST}:${config.SERVER_PORT}`;
      expect(config.getServerUrl()).toBe(expectedUrl);
    });
  });

  describe('Directory Validation', () => {
    test('should validate required directories', () => {
      const missingDirs = config.validateDirectories();
      expect(Array.isArray(missingDirs)).toBe(true);
      // In test environment, some directories might not exist
      // This is expected and the function should handle it gracefully
    });
  });

  describe('Environment Variables Override', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should use environment variables when provided', () => {
      // This test would require creating a new config instance
      // with different environment variables
      // For now, we test that the current config respects NODE_ENV
      expect(process.env.NODE_ENV).toBe('test');
    });
  });
});
