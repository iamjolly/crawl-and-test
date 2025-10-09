/**
 * Password Validator Tests
 */

const { validatePassword, getPasswordStrength } = require('../../../src/utils/password-validator');

describe('Password Validator', () => {
  describe('validatePassword', () => {
    test('should accept strong password', () => {
      const result = validatePassword('SecurePass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should accept password without special characters', () => {
      const result = validatePassword('SecurePassword123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Short1A');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    test('should reject password without uppercase letter', () => {
      const result = validatePassword('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    test('should reject password without lowercase letter', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    test('should reject password without number', () => {
      const result = validatePassword('PasswordOnly');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    test('should reject common weak passwords', () => {
      const weakPasswords = ['password123', '12345678', 'qwerty123'];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('too common'))).toBe(true);
      });
    });

    test('should reject password longer than 72 characters', () => {
      const longPassword = 'A'.repeat(60) + 'b'.repeat(13) + '1'; // 74 chars
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 72 characters');
    });

    test('should reject null or undefined password', () => {
      expect(validatePassword(null).valid).toBe(false);
      expect(validatePassword(undefined).valid).toBe(false);
      expect(validatePassword('').valid).toBe(false);
    });

    test('should return multiple errors for very weak password', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('getPasswordStrength', () => {
    test('should rate strong password as strong', () => {
      const result = getPasswordStrength('MySecureP@ssw0rd123!');
      expect(result.strength).toMatch(/strong/i);
      expect(result.score).toBeGreaterThan(5);
    });

    test('should rate weak password as weak', () => {
      const result = getPasswordStrength('pass123');
      expect(result.strength).toBe('weak');
      expect(result.score).toBeLessThanOrEqual(3);
    });

    test('should rate medium password as medium', () => {
      const result = getPasswordStrength('Password123');
      expect(result.strength).toBe('medium');
      expect(result.score).toBeGreaterThan(3);
      expect(result.score).toBeLessThanOrEqual(5);
    });

    test('should return none for empty password', () => {
      const result = getPasswordStrength('');
      expect(result.strength).toBe('none');
      expect(result.score).toBe(0);
    });

    test('should give higher score to longer passwords', () => {
      const short = getPasswordStrength('Pass123');
      const long = getPasswordStrength('LongerPassword123!@#');
      expect(long.score).toBeGreaterThan(short.score);
    });
  });
});
