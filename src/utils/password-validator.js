/**
 * Password Validation Utility
 * Validates password strength requirements
 */

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with any error messages
 */
function validatePassword(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length (prevent DoS attacks via bcrypt)
  if (password.length > 72) {
    errors.push('Password must not exceed 72 characters');
  }

  // Require uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Require lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Require number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Optional: Require special character
  // Uncomment to enable:
  // if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
  //   errors.push('Password must contain at least one special character');
  // }

  // Check for common weak passwords
  const commonPasswords = [
    'password',
    '12345678',
    'password123',
    'qwerty123',
    'abc123456',
    'password1',
    '123456789',
    'qwertyuiop',
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get password strength level
 * @param {string} password - The password to evaluate
 * @returns {{strength: string, score: number}} Strength level and score
 */
function getPasswordStrength(password) {
  let score = 0;

  if (!password) {
    return { strength: 'none', score: 0 };
  }

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1;

  // Character diversity bonus
  const uniqueChars = new Set(password.split('')).size;
  if (uniqueChars >= password.length * 0.6) score += 1;

  // Determine strength level
  if (score <= 3) return { strength: 'weak', score };
  if (score <= 5) return { strength: 'medium', score };
  if (score <= 7) return { strength: 'strong', score };
  return { strength: 'very strong', score };
}

module.exports = {
  validatePassword,
  getPasswordStrength,
};
