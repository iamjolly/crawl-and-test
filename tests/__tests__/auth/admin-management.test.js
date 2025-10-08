/**
 * Admin User Management Tests
 * Tests for admin user management API endpoints
 */

const request = require('supertest');
const { sequelize, User } = require('../../../src/models');

describe('Admin User Management', () => {
  let app;
  let adminUser;
  let regularUser;
  let pendingUser;
  let adminAgent;
  let userAgent;
  const pools = [];

  beforeAll(async () => {
    // Set auth enabled for tests
    process.env.CATS_AUTH_ENABLED = 'true';
    process.env.CATS_JWT_SECRET = 'test-secret-key-for-testing-only';
    process.env.CATS_SESSION_SECRET = 'test-session-secret-for-testing';

    // Drop all tables first
    await sequelize.query('DROP TABLE IF EXISTS "crawl_jobs" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "session" CASCADE;');
    await sequelize.query('DROP TABLE IF EXISTS "users" CASCADE;');

    // Sync database
    await sequelize.sync({ force: true });

    // Create session table
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
    // Clean up database
    await sequelize.query('TRUNCATE TABLE "users" CASCADE;');

    // Create fresh app instance
    delete require.cache[require.resolve('../../../src/servers/dashboard.js')];
    app = require('../../../src/servers/dashboard.js');

    if (app && app.locals && app.locals.sessionPool) {
      pools.push(app.locals.sessionPool);
    }

    // Create test users
    adminUser = await User.create({
      email: 'admin@example.com',
      password_hash: 'SecurePassword123!',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: true,
      email_verified: true,
    });

    regularUser = await User.create({
      email: 'user@example.com',
      password_hash: 'SecurePassword123!',
      first_name: 'Regular',
      last_name: 'User',
      role: 'user',
      is_active: true,
      email_verified: true,
    });

    pendingUser = await User.create({
      email: 'pending@example.com',
      password_hash: 'SecurePassword123!',
      first_name: 'Pending',
      last_name: 'User',
      role: 'user',
      is_active: false,
      email_verified: false,
    });

    // Create authenticated agents
    adminAgent = request.agent(app);
    await adminAgent.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'SecurePassword123!',
    });

    userAgent = request.agent(app);
    await userAgent.post('/api/auth/login').send({
      email: 'user@example.com',
      password: 'SecurePassword123!',
    });
  });

  afterAll(async () => {
    for (const pool of pools) {
      if (pool && !pool.ended) {
        await pool.end();
      }
    }
    await sequelize.close();
  });

  describe('GET /api/admin/users', () => {
    test('should return all users for admin', async () => {
      const response = await adminAgent.get('/api/admin/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.users.length).toBe(3);
    });

    test('should filter users by search query', async () => {
      const response = await adminAgent.get('/api/admin/users?search=pending');

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(1);
      expect(response.body.users[0].email).toBe('pending@example.com');
    });

    test('should filter users by role', async () => {
      const response = await adminAgent.get('/api/admin/users?role=admin');

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(1);
      expect(response.body.users[0].role).toBe('admin');
    });

    test('should filter users by status', async () => {
      const response = await adminAgent.get('/api/admin/users?status=inactive');

      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(1);
      expect(response.body.users[0].is_active).toBe(false);
    });

    test('should deny access to non-admin users', async () => {
      const response = await userAgent.get('/api/admin/users');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should deny access to unauthenticated users', async () => {
      const response = await request(app).get('/api/admin/users');

      // Passport redirects unauthenticated users
      expect([302, 401]).toContain(response.status);
    });
  });

  describe('GET /api/admin/users/pending', () => {
    test('should return count of pending users for admin', async () => {
      const response = await adminAgent.get('/api/admin/users/pending');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBe(1);
      expect(response.body.users.length).toBe(1);
      expect(response.body.users[0].email).toBe('pending@example.com');
    });

    test('should deny access to non-admin users', async () => {
      const response = await userAgent.get('/api/admin/users/pending');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    test('should return user details for admin', async () => {
      const response = await adminAgent.get(`/api/admin/users/${regularUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('user@example.com');
      expect(response.body.user.first_name).toBe('Regular');
    });

    test('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await adminAgent.get(`/api/admin/users/${fakeId}`);

      expect(response.status).toBe(404);
    });

    test('should deny access to non-admin users', async () => {
      const response = await userAgent.get(`/api/admin/users/${regularUser.id}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/users/:id/approve', () => {
    test('should approve pending user', async () => {
      const response = await adminAgent.patch(`/api/admin/users/${pendingUser.id}/approve`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('approved');

      // Verify user is now active
      const user = await User.findByPk(pendingUser.id);
      expect(user.is_active).toBe(true);
    });

    test('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await adminAgent.patch(`/api/admin/users/${fakeId}/approve`);

      expect(response.status).toBe(404);
    });

    test('should deny access to non-admin users', async () => {
      const response = await userAgent.patch(`/api/admin/users/${pendingUser.id}/approve`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/users/:id/reject', () => {
    test('should reject (delete) pending user', async () => {
      const response = await adminAgent.patch(`/api/admin/users/${pendingUser.id}/reject`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('rejected');

      // Verify user was deleted
      const user = await User.findByPk(pendingUser.id);
      expect(user).toBeNull();
    });

    test('should deny access to non-admin users', async () => {
      const response = await userAgent.patch(`/api/admin/users/${pendingUser.id}/reject`);

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/users/:id/toggle-active', () => {
    test('should deactivate active user', async () => {
      const response = await adminAgent.patch(`/api/admin/users/${regularUser.id}/toggle-active`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deactivated');

      // Verify user is now inactive
      const user = await User.findByPk(regularUser.id);
      expect(user.is_active).toBe(false);
    });

    test('should activate inactive user', async () => {
      const response = await adminAgent.patch(`/api/admin/users/${pendingUser.id}/toggle-active`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('activated');

      // Verify user is now active
      const user = await User.findByPk(pendingUser.id);
      expect(user.is_active).toBe(true);
    });

    test('should prevent admin from deactivating themselves', async () => {
      const response = await adminAgent.patch(`/api/admin/users/${adminUser.id}/toggle-active`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot deactivate your own account');
    });

    test('should deny access to non-admin users', async () => {
      const response = await userAgent.patch(`/api/admin/users/${regularUser.id}/toggle-active`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    test('should update user details', async () => {
      const response = await adminAgent.put(`/api/admin/users/${regularUser.id}`).send({
        firstName: 'Updated',
        lastName: 'Name',
        email: 'updated@example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');

      // Verify user was updated
      const user = await User.findByPk(regularUser.id);
      expect(user.first_name).toBe('Updated');
      expect(user.last_name).toBe('Name');
      expect(user.email).toBe('updated@example.com');
    });

    test('should update user role', async () => {
      const response = await adminAgent.put(`/api/admin/users/${regularUser.id}`).send({
        role: 'admin',
      });

      expect(response.status).toBe(200);

      // Verify role was updated
      const user = await User.findByPk(regularUser.id);
      expect(user.role).toBe('admin');
    });

    test('should prevent admin from demoting themselves', async () => {
      const response = await adminAgent.put(`/api/admin/users/${adminUser.id}`).send({
        role: 'user',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot change your own admin role');
    });

    test('should reject duplicate email', async () => {
      const response = await adminAgent.put(`/api/admin/users/${regularUser.id}`).send({
        email: 'admin@example.com', // Already exists
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already in use');
    });

    test('should deny access to non-admin users', async () => {
      const response = await userAgent.put(`/api/admin/users/${regularUser.id}`).send({
        firstName: 'Hacked',
      });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    test('should delete user', async () => {
      const response = await adminAgent.delete(`/api/admin/users/${regularUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // Verify user was deleted
      const user = await User.findByPk(regularUser.id);
      expect(user).toBeNull();
    });

    test('should prevent admin from deleting themselves', async () => {
      const response = await adminAgent.delete(`/api/admin/users/${adminUser.id}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot delete your own account');
    });

    test('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await adminAgent.delete(`/api/admin/users/${fakeId}`);

      expect(response.status).toBe(404);
    });

    test('should deny access to non-admin users', async () => {
      const response = await userAgent.delete(`/api/admin/users/${regularUser.id}`);

      expect(response.status).toBe(403);
    });
  });
});
