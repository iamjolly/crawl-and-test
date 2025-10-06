const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { User } = require('../models');

// JWT secret from environment or default (should be in .env)
const JWT_SECRET = process.env.CATS_JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Local Strategy (Email/Password Authentication)
 * Used for login with email and password
 */
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email', // Use email instead of username
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Check if user is active
        if (!user.is_active) {
          return done(null, false, { message: 'Account is disabled' });
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);

        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        // Update last login timestamp
        await user.update({ last_login_at: new Date() });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

/**
 * JWT Strategy (Token Authentication)
 * Used for API authentication with Bearer tokens
 */
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    },
    async (jwtPayload, done) => {
      try {
        // Find user by ID from JWT payload
        const user = await User.findByPk(jwtPayload.id);

        if (!user) {
          return done(null, false);
        }

        // Check if user is active
        if (!user.is_active) {
          return done(null, false);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

/**
 * Serialize user for session storage
 * Only store user ID in session
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 * Retrieve full user object from database
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
