/**
 * Authentication Tests
 * Tests for user registration, login, and logout functionality
 */

const request = require('supertest');
const { sequelize, User } = require('../../../src/models');

describe('Authentication', () => {
  let app;
  const pools = []; // Track all connection pools created during tests

  beforeAll(async () => {
    // Set auth enabled for tests
    process.env.CATS_AUTH_ENABLED = 'true';
    process.env.CATS_JWT_SECRET = 'test-secret-key-for-testing-only';
    process.env.CATS_SESSION_SECRET = 'test-session-secret-for-testing';

    // Drop all tables first to avoid "relation already exists" errors
    await sequelize.query('DROP TABLE IF EXISTS "crawl_jobs" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "session" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "users" CASCADE;');

    // Sync database - create fresh tables
    await sequelize.sync({ force: true });

    // Create session table for connect-pg-simple
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      ) WITH (OIDS=FALSE);
    `);
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");'
    );
  });

  beforeEach(async () => {
    // Clean up database before each test
    // Use CASCADE to handle foreign key constraints
    await sequelize.query('TRUNCATE TABLE "users" CASCADE;');

    // Create a fresh app instance for each test
    // Note: We need to require the app after setting env vars
    delete require.cache[require.resolve('../../../src/servers/dashboard.js')];
    app = require('../../../src/servers/dashboard.js');

    // Track the session pool for cleanup
    if (app && app.locals && app.locals.sessionPool) {
      pools.push(app.locals.sessionPool);
    }

    // Ensure database is ready
    await sequelize.authenticate();
  });

  afterAll(async () => {
    // Close all connection pools created during tests
    for (const pool of pools) {
      if (pool && !pool.ended) {
        await pool.end();
      }
    }
    await sequelize.close();
  });

  describe('User Registration', () => {
    test('should successfully register a new user', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('message');

      // Verify user was created in database
      const user = await User.findOne({ where: { email: 'newuser@example.com' } });
      expect(user).toBeTruthy();
      expect(user.first_name).toBe('Test');
      expect(user.last_name).toBe('User');
      expect(user.role).toBe('user');
      expect(user.is_active).toBe(false); // New users require admin approval
    });

    test('should reject registration with missing email', async () => {
      const response = await request(app).post('/api/auth/register').send({
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with missing password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with invalid email format', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'invalid-email-format',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject registration with duplicate email', async () => {
      // Create first user
      await User.create({
        email: 'duplicate@example.com',
        password_hash: 'hashedpassword',
        first_name: 'First',
        last_name: 'User',
      });

      // Try to create second user with same email
      const response = await request(app).post('/api/auth/register').send({
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        firstName: 'Second',
        lastName: 'User',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already exists|duplicate/i);
    });

    test('should hash password before storing', async () => {
      const plainPassword = 'SecurePassword123!';

      await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: plainPassword,
        firstName: 'Test',
        lastName: 'User',
      });

      const user = await User.findOne({ where: { email: 'test@example.com' } });
      expect(user.password_hash).not.toBe(plainPassword);
      expect(user.password_hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app).post('/api/auth/register').send({
        email: 'logintest@example.com',
        password: 'TestPassword123!',
        firstName: 'Login',
        lastName: 'Test',
      });
    });

    test('should successfully login with valid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'logintest@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'logintest@example.com');
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(response.headers).toHaveProperty('set-cookie');
    });

    test('should reject login with incorrect password', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'logintest@example.com',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid|incorrect/i);
    });

    test('should reject login with non-existent email', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject login with missing credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({});

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should update last_login_at timestamp on successful login', async () => {
      const userBefore = await User.findOne({ where: { email: 'logintest@example.com' } });
      const lastLoginBefore = userBefore.last_login_at;

      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      await request(app).post('/api/auth/login').send({
        email: 'logintest@example.com',
        password: 'TestPassword123!',
      });

      const userAfter = await User.findOne({ where: { email: 'logintest@example.com' } });
      expect(userAfter.last_login_at).not.toBe(lastLoginBefore);
      expect(new Date(userAfter.last_login_at).getTime()).toBeGreaterThan(
        new Date(lastLoginBefore || 0).getTime()
      );
    });
  });

  describe('User Logout', () => {
    test('should successfully logout', async () => {
      // First register
      await request(app).post('/api/auth/register').send({
        email: 'logouttest@example.com',
        password: 'TestPassword123!',
        firstName: 'Logout',
        lastName: 'Test',
      });

      const agent = request.agent(app);
      await agent.post('/api/auth/login').send({
        email: 'logouttest@example.com',
        password: 'TestPassword123!',
      });

      // Then logout
      const response = await agent.post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    test('should clear session on logout', async () => {
      const agent = request.agent(app);

      // Register and login
      await agent.post('/api/auth/register').send({
        email: 'sessiontest@example.com',
        password: 'TestPassword123!',
        firstName: 'Session',
        lastName: 'Test',
      });

      await agent.post('/api/auth/login').send({
        email: 'sessiontest@example.com',
        password: 'TestPassword123!',
      });

      // Verify logged in (access protected route)
      let dashboardResponse = await agent.get('/dashboard');
      expect(dashboardResponse.status).toBe(200);

      // Logout
      await agent.post('/api/auth/logout');

      // Verify logged out (should redirect to login)
      dashboardResponse = await agent.get('/dashboard');
      expect([302, 401]).toContain(dashboardResponse.status);
    });
  });

  describe('Session Persistence', () => {
    test('should maintain session across requests', async () => {
      const agent = request.agent(app);

      // Register
      await agent.post('/api/auth/register').send({
        email: 'sessionpersist@example.com',
        password: 'TestPassword123!',
        firstName: 'Session',
        lastName: 'Persist',
      });

      // Login
      await agent.post('/api/auth/login').send({
        email: 'sessionpersist@example.com',
        password: 'TestPassword123!',
      });

      // Make multiple authenticated requests
      const response1 = await agent.get('/dashboard');
      const response2 = await agent.get('/crawl');
      const response3 = await agent.get('/reports/');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response3.status).toBe(200);
    });
  });
});
