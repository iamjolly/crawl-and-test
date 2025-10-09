const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { validatePassword } = require('../utils/password-validator');

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user (password will be hashed automatically by User model hooks)
    // is_active defaults to false (requires admin approval)
    const user = await User.create({
      email,
      password_hash: password, // Will be hashed by beforeCreate hook
      first_name: firstName,
      last_name: lastName,
      role: 'user',
      email_verified: false,
    });

    // Don't auto-login since user needs approval
    res.status(201).json({
      message: 'Registration successful',
      info: 'Your account is pending approval. An administrator will review your request shortly.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
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

    // Check if user account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account pending approval',
        message: 'Your account is awaiting admin approval. Please contact an administrator.',
      });
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
