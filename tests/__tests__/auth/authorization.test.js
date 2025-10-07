/**
 * Authorization Tests
 * Tests for route protection, job ownership, and role-based access control
 */

const request = require('supertest');
const { sequelize, User, CrawlJob } = require('../../../src/models');
const { randomUUID } = require('crypto');

describe('Authorization', () => {
  let app;
  let testUser1;
  let testUser2;
  let adminUser;
  let agent1;
  let agent2;
  let agentAdmin;

  beforeAll(async () => {
    // Set auth enabled for tests
    process.env.CATS_AUTH_ENABLED = 'true';
    process.env.CATS_JWT_SECRET = 'test-secret-key-for-testing-only';
    process.env.CATS_SESSION_SECRET = 'test-session-secret-for-testing';

    // Sync database
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Clean up database
    // Use CASCADE to handle foreign key constraints (crawl_jobs references users)
    await sequelize.query('TRUNCATE TABLE "crawl_jobs", "users" CASCADE;');

    // Create fresh app instance
    delete require.cache[require.resolve('../../../src/servers/dashboard.js')];
    app = require('../../../src/servers/dashboard.js');

    // Create test users
    testUser1 = await User.create({
      email: 'user1@example.com',
      password_hash: 'TestPassword123!',
      first_name: 'User',
      last_name: 'One',
      role: 'user',
    });

    testUser2 = await User.create({
      email: 'user2@example.com',
      password_hash: 'TestPassword123!',
      first_name: 'User',
      last_name: 'Two',
      role: 'user',
    });

    adminUser = await User.create({
      email: 'admin@example.com',
      password_hash: 'AdminPassword123!',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
    });

    // Create authenticated agents
    agent1 = request.agent(app);
    await agent1.post('/api/auth/login').send({
      email: 'user1@example.com',
      password: 'TestPassword123!',
    });

    agent2 = request.agent(app);
    await agent2.post('/api/auth/login').send({
      email: 'user2@example.com',
      password: 'TestPassword123!',
    });

    agentAdmin = request.agent(app);
    await agentAdmin.post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'AdminPassword123!',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Route Protection', () => {
    test('should block unauthenticated access to /dashboard', async () => {
      const response = await request(app).get('/dashboard');
      expect([302, 401]).toContain(response.status);
    });

    test('should block unauthenticated access to /crawl', async () => {
      const response = await request(app).get('/crawl');
      expect([302, 401]).toContain(response.status);
    });

    test('should block unauthenticated access to /reports/', async () => {
      const response = await request(app).get('/reports/');
      expect([302, 401]).toContain(response.status);
    });

    test('should block unauthenticated access to /api/jobs', async () => {
      const response = await request(app).get('/api/jobs');
      expect([302, 401]).toContain(response.status);
    });

    test('should block unauthenticated access to /api/reports', async () => {
      const response = await request(app).get('/api/reports');
      expect([302, 401]).toContain(response.status);
    });

    test('should block unauthenticated job creation', async () => {
      const response = await request(app).post('/crawl').send({
        url: 'https://example.com',
        wcagVersion: '2.1',
        wcagLevel: 'AA',
      });
      expect([302, 401]).toContain(response.status);
    });

    test('should allow authenticated access to protected routes', async () => {
      const dashboardResponse = await agent1.get('/dashboard');
      const crawlResponse = await agent1.get('/crawl');
      const reportsResponse = await agent1.get('/reports/');

      expect(dashboardResponse.status).toBe(200);
      expect(crawlResponse.status).toBe(200);
      expect(reportsResponse.status).toBe(200);
    });
  });

  describe('Job Ownership', () => {
    let user1Job;
    let user2Job;

    beforeEach(async () => {
      // Create jobs for each user
      user1Job = await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser1.id,
        domain: 'example.com',
        status: 'completed',
        options: { url: 'https://example.com' },
      });

      user2Job = await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser2.id,
        domain: 'test.com',
        status: 'completed',
        options: { url: 'https://test.com' },
      });
    });

    test('should only show user their own jobs', async () => {
      const response = await agent1.get('/api/jobs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allJobs');

      const jobIds = response.body.allJobs.map(j => j.jobId);
      expect(jobIds).toContain(user1Job.id);
      expect(jobIds).not.toContain(user2Job.id);
    });

    test('should show admin all jobs', async () => {
      const response = await agentAdmin.get('/api/jobs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allJobs');

      const jobIds = response.body.allJobs.map(j => j.jobId);
      expect(jobIds).toContain(user1Job.id);
      expect(jobIds).toContain(user2Job.id);
    });

    test('should only show user their own reports', async () => {
      const response = await agent1.get('/api/reports');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Filter reports by domains user1 has jobs for
      const domains = response.body.map(r => r.domain);
      expect(domains).toContain('example.com');
      expect(domains).not.toContain('test.com');
    });

    test('should show admin all reports', async () => {
      const response = await agentAdmin.get('/api/reports');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Job Cancellation Authorization', () => {
    let user1Job;
    let user2Job;

    beforeEach(async () => {
      // Create running jobs
      user1Job = await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser1.id,
        domain: 'example.com',
        status: 'running',
        options: { url: 'https://example.com' },
      });

      user2Job = await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser2.id,
        domain: 'test.com',
        status: 'running',
        options: { url: 'https://test.com' },
      });
    });

    test('should allow user to cancel their own job', async () => {
      const response = await agent1.delete(`/api/jobs/${user1Job.id}`);

      // May be 200 (success) or 404 (not in active jobs) depending on timing
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      }
    });

    test("should block user from canceling another user's job", async () => {
      const response = await agent1.delete(`/api/jobs/${user2Job.id}`);

      // Should get 403 Forbidden or 404 (if not in active jobs)
      expect([403, 404]).toContain(response.status);

      if (response.status === 403) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toMatch(/not authorized/i);
      }
    });

    test('should allow admin to cancel any job', async () => {
      const response = await agentAdmin.delete(`/api/jobs/${user1Job.id}`);

      // May be 200 (success) or 404 (not in active jobs)
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
      }
    });

    test('should block unauthenticated job cancellation', async () => {
      const response = await request(app).delete(`/api/jobs/${user1Job.id}`);

      expect([302, 401]).toContain(response.status);
    });
  });

  describe('User-Specific Statistics', () => {
    beforeEach(async () => {
      // Create various jobs for user1
      await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser1.id,
        domain: 'example1.com',
        status: 'completed',
        options: {},
      });

      await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser1.id,
        domain: 'example2.com',
        status: 'running',
        options: {},
      });

      await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser1.id,
        domain: 'example3.com',
        status: 'error',
        options: {},
      });

      // Create jobs for user2
      await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser2.id,
        domain: 'test1.com',
        status: 'completed',
        options: {},
      });
    });

    test('should return user-specific stats for regular user', async () => {
      const response = await agent1.get('/api/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total', 3);
      expect(response.body).toHaveProperty('completed', 1);
      expect(response.body).toHaveProperty('running', 1);
      expect(response.body).toHaveProperty('failed', 1);
    });

    test('should return system-wide stats for admin', async () => {
      const response = await agentAdmin.get('/api/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total', 4); // All jobs
      expect(response.body).toHaveProperty('completed', 2);
      expect(response.body).toHaveProperty('running', 1);
      expect(response.body).toHaveProperty('failed', 1);
    });
  });

  describe('Role-Based Access', () => {
    test('should identify admin user role correctly', async () => {
      expect(adminUser.isAdmin()).toBe(true);
      expect(testUser1.isAdmin()).toBe(false);
    });

    test('should check job modification permissions correctly', async () => {
      const job = await CrawlJob.create({
        id: randomUUID(),
        user_id: testUser1.id,
        domain: 'example.com',
        status: 'running',
        options: {},
      });

      // Owner can modify
      expect(job.canUserModify(testUser1.id, 'user')).toBe(true);

      // Other user cannot modify
      expect(job.canUserModify(testUser2.id, 'user')).toBe(false);

      // Admin can modify
      expect(job.canUserModify(adminUser.id, 'admin')).toBe(true);
    });
  });

  describe('Feature Flag - Auth Disabled', () => {
    beforeEach(() => {
      process.env.CATS_AUTH_ENABLED = 'false';

      // Reload app with auth disabled
      delete require.cache[require.resolve('../../../src/servers/dashboard.js')];
      app = require('../../../src/servers/dashboard.js');
    });

    afterEach(() => {
      process.env.CATS_AUTH_ENABLED = 'true';
    });

    test('should allow access to protected routes when auth disabled', async () => {
      const dashboardResponse = await request(app).get('/dashboard');
      const crawlResponse = await request(app).get('/crawl');

      expect(dashboardResponse.status).toBe(200);
      expect(crawlResponse.status).toBe(200);
    });

    test('should show all jobs when auth disabled', async () => {
      const response = await request(app).get('/api/jobs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allJobs');
    });
  });
});
