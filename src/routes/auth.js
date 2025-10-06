const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// JWT secret
const JWT_SECRET = process.env.CATS_JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.CATS_JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user (password will be hashed automatically by User model hooks)
    const user = await User.create({
      email,
      password_hash: password, // Will be hashed by beforeCreate hook
      first_name: firstName,
      last_name: lastName,
      role: 'user',
      is_active: true,
      email_verified: false,
    });

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Log user in via session
    req.login(user, err => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('Session login error:', err);
        // Still return success even if session fails
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }

    // Log user in via session
    req.login(user, err => {
      if (err) {
        return next(err);
      }

      // Generate JWT token for API access
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        token,
      });
    });
  })(req, res, next);
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }

    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ error: 'Failed to destroy session' });
      }

      res.json({ message: 'Logout successful' });
    });
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      role: req.user.role,
      isActive: req.user.is_active,
      emailVerified: req.user.email_verified,
      lastLoginAt: req.user.last_login_at,
    },
  });
});

module.exports = router;
