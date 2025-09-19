/**
 * Security middleware for CATS dashboard
 * Implements security headers, rate limiting, and input validation
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');

/**
 * Configure Helmet security headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for accessibility testing tools
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Rate limiting configurations
 */
const createRateLimit = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });

// General API rate limit
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Crawl API rate limit (more restrictive)
const crawlRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // limit each IP to 10 crawl requests per hour
  'Too many crawl requests from this IP, please try again later.'
);

/**
 * Input validation schemas
 */
const crawlValidation = [
  body('url')
    .isURL({ protocols: ['https'] })
    .withMessage('URL must be a valid HTTPS URL')
    .isLength({ max: 2000 })
    .withMessage('URL must be less than 2000 characters'),

  body('depth').optional().isInt({ min: 1, max: 10 }).withMessage('Depth must be between 1 and 10'),

  body('concurrency')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Concurrency must be between 1 and 20'),

  body('maxPages')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max pages must be between 1 and 1000'),

  body('wcagVersion')
    .optional()
    .isIn(['2.0', '2.1', '2.2'])
    .withMessage('WCAG version must be 2.0, 2.1, or 2.2'),

  body('wcagLevel')
    .optional()
    .isIn(['A', 'AA', 'AAA'])
    .withMessage('WCAG level must be A, AA, or AAA'),
];

const domainValidation = [
  param('domain')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Invalid domain format')
    .isLength({ max: 255 })
    .withMessage('Domain must be less than 255 characters'),
];

const reportValidation = [
  param('filename')
    .matches(/^[a-zA-Z0-9._-]+\.(json|html)$/)
    .withMessage('Invalid filename format')
    .isLength({ max: 255 })
    .withMessage('Filename must be less than 255 characters'),
];

/**
 * Validation error handler middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

/**
 * Security logging middleware
 */
const securityLogger = (req, res, next) => {
  // Log security-relevant requests
  const isCrawlPost = req.method === 'POST' && req.path === '/api/crawl';
  const isSensitiveMethod = ['DELETE', 'PUT', 'PATCH'].includes(req.method);

  if (isCrawlPost || isSensitiveMethod) {
    console.log(
      `[SECURITY] ${req.method} ${req.originalUrl} - IP: ${req.ip} - UA: ${req.get('User-Agent')}`
    );
  }

  next();
};

/**
 * Sanitize file paths to prevent directory traversal
 */
const sanitizePath = path => {
  return path.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
};

module.exports = {
  helmetConfig,
  generalRateLimit,
  crawlRateLimit,
  crawlValidation,
  domainValidation,
  reportValidation,
  handleValidationErrors,
  securityLogger,
  sanitizePath,
};
