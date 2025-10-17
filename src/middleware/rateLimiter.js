/**
 * Rate Limiting Middleware
 * Protects endpoints from brute force and abuse
 */

const rateLimit = require('express-rate-limit');

// Skip rate limiting in test environment
const skipRateLimiting = process.env.NODE_ENV === 'test';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force password attacks
 */
const authLimiter = rateLimit({
  skip: () => skipRateLimiting,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  message: {
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false, // Count failed requests
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

/**
 * Moderate rate limiter for API endpoints
 * Prevents API abuse
 */
const apiLimiter = rateLimit({
  skip: () => skipRateLimiting,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: {
    error: 'Too many API requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Global rate limiter for all routes
 * Prevents general abuse and DoS
 */
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // Skip in test environment
    if (skipRateLimiting) return true;

    // Skip rate limiting for health checks and static assets
    return (
      req.path.startsWith('/health') ||
      req.path.startsWith('/styles') ||
      req.path.startsWith('/scripts') ||
      req.path.startsWith('/images')
    );
  },
});

/**
 * Strict limiter for password reset requests
 */
const passwordResetLimiter = rateLimit({
  skip: () => skipRateLimiting,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per hour per IP
  message: {
    error: 'Too many password reset attempts. Please try again in 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  globalLimiter,
  passwordResetLimiter,
};
