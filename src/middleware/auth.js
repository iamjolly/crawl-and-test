const passport = require('passport');

/**
 * Middleware to require authentication
 * Checks if user is logged in via session or JWT
 */
function requireAuth(req, res, next) {
  // Check if auth is enabled
  const authEnabled = process.env.CATS_AUTH_ENABLED === 'true';

  if (!authEnabled) {
    // Auth disabled - allow all requests
    return next();
  }

  // Check session authentication first
  if (req.isAuthenticated()) {
    return next();
  }

  // Try JWT authentication
  passport.authenticate('jwt', { session: false }, (err, user, _info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      // Not authenticated - redirect to login or return 401
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return res.redirect(`/login?returnUrl=${encodeURIComponent(req.originalUrl)}`);
    }

    // Set user on request
    req.user = user;
    next();
  })(req, res, next);
}

/**
 * Middleware to require admin role
 * Must be used after requireAuth
 */
function requireAdmin(req, res, next) {
  // Check if auth is enabled
  const authEnabled = process.env.CATS_AUTH_ENABLED === 'true';

  if (!authEnabled) {
    // Auth disabled - allow all requests
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.isAdmin()) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Optional auth middleware
 * Attaches user to request if authenticated, but doesn't require it
 */
function optionalAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  // Try JWT authentication
  passport.authenticate('jwt', { session: false }, (err, user, _info) => {
    if (err) {
      return next(err);
    }

    if (user) {
      req.user = user;
    }

    next();
  })(req, res, next);
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
};
