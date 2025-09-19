/**
 * Sample test file to verify Jest setup
 */

describe('Sample Tests', () => {
  test('should verify Jest is working', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have access to test utilities', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.createMockUrl).toBe('function');
    expect(typeof global.testUtils.createMockViolation).toBe('function');
    expect(typeof global.testUtils.createMockAxeResults).toBe('function');
  });

  test('should create mock URL correctly', () => {
    const url = global.testUtils.createMockUrl('example.com', '/test-path');
    expect(url).toBe('https://example.com/test-path');
  });

  test('should create mock violation correctly', () => {
    const violation = global.testUtils.createMockViolation('test-rule', 'critical');
    expect(violation).toHaveProperty('id', 'test-rule');
    expect(violation).toHaveProperty('impact', 'critical');
    expect(violation).toHaveProperty('nodes');
    expect(Array.isArray(violation.nodes)).toBe(true);
  });

  test('should create mock axe results correctly', () => {
    const results = global.testUtils.createMockAxeResults(3);
    expect(results).toHaveProperty('url');
    expect(results).toHaveProperty('timestamp');
    expect(results).toHaveProperty('violations');
    expect(results.violations).toHaveLength(3);
  });

  test('should handle async operations', async () => {
    const promise = new Promise(resolve => {
      setTimeout(() => resolve('test-result'), 100);
    });

    const result = await promise;
    expect(result).toBe('test-result');
  });
});
