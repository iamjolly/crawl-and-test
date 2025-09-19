/**
 * Basic functionality tests to verify the setup works
 */

describe('Basic Project Functionality', () => {
  test('should be able to require core config', () => {
    const config = require('../../src/core/config');
    expect(config).toBeDefined();
    expect(config.APP_NAME).toBe('CATS');
  });

  test('should have proper Node.js environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.version).toBeDefined();
  });

  test('should be able to work with URLs', () => {
    const { URL } = require('url');
    const testUrl = new URL('https://example.com/test');
    expect(testUrl.hostname).toBe('example.com');
    expect(testUrl.pathname).toBe('/test');
  });

  test('should be able to work with file paths', () => {
    const path = require('path');
    const testPath = path.join('src', 'core', 'config.js');
    expect(testPath).toContain('config.js');
  });

  test('should have access to file system', () => {
    const fs = require('fs');
    const packageJsonExists = fs.existsSync('package.json');
    expect(packageJsonExists).toBe(true);
  });
});
