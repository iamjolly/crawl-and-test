/**
 * Page Accessibility Tests
 * Tests CATS pages for accessibility violations using axe-core
 */

const { chromium } = require('playwright');
const { injectAxe, getViolations } = require('axe-playwright');
const { sequelize, User } = require('../../../src/models');

describe('Page Accessibility Tests', () => {
  let browser;
  let context;
  let page;
  let app;
  let server;
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
    await sequelize.query('DROP TABLE IF EXISTS "audit_logs" CASCADE;');

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

    // Create test users
    await User.create({
      email: 'admin@example.com',
      password_hash: 'TestPassword123!',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: true,
      email_verified: true,
    });

    await User.create({
      email: 'user@example.com',
      password_hash: 'TestPassword123!',
      first_name: 'Regular',
      last_name: 'User',
      role: 'user',
      is_active: true,
      email_verified: true,
    });

    // Create app instance
    delete require.cache[require.resolve('../../../src/servers/dashboard.js')];
    app = require('../../../src/servers/dashboard.js');

    if (app && app.locals && app.locals.sessionPool) {
      pools.push(app.locals.sessionPool);
    }

    // Start server
    server = app.listen(3001);

    // Launch browser
    browser = await chromium.launch();
  });

  beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterEach(async () => {
    await page.close();
    await context.close();
  });

  afterAll(async () => {
    await browser.close();
    server.close();

    for (const pool of pools) {
      if (pool && !pool.ended) {
        await pool.end();
      }
    }
    await sequelize.close();
  });

  describe('Public Pages', () => {
    test('Home page should have no accessibility violations', async () => {
      await page.goto('http://localhost:3001/');
      await injectAxe(page);

      const violations = await getViolations(page);

      expect(violations).toHaveLength(0);
    }, 30000);

    test('Login page should have no accessibility violations', async () => {
      await page.goto('http://localhost:3001/login');
      await injectAxe(page);

      const violations = await getViolations(page);

      expect(violations).toHaveLength(0);
    }, 30000);

    test('Registration page should have no accessibility violations', async () => {
      await page.goto('http://localhost:3001/register');
      await injectAxe(page);

      const violations = await getViolations(page);

      expect(violations).toHaveLength(0);
    }, 30000);
  });

  describe('Authenticated Pages - Regular User', () => {
    beforeEach(async () => {
      // Login as regular user
      await page.goto('http://localhost:3001/login');
      await page.fill('input[name="email"]', 'user@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('http://localhost:3001/dashboard');
    });

    test('Dashboard page should have no accessibility violations', async () => {
      await injectAxe(page);

      const violations = await getViolations(page);

      expect(violations).toHaveLength(0);
    }, 30000);

    test('Crawl page should have no accessibility violations', async () => {
      await page.goto('http://localhost:3001/crawl');
      await injectAxe(page);

      const violations = await getViolations(page);

      expect(violations).toHaveLength(0);
    }, 30000);

    test('Reports page should have no accessibility violations', async () => {
      await page.goto('http://localhost:3001/reports/');
      await injectAxe(page);

      const violations = await getViolations(page);

      expect(violations).toHaveLength(0);
    }, 30000);
  });

  describe('Authenticated Pages - Admin User', () => {
    beforeEach(async () => {
      // Login as admin
      await page.goto('http://localhost:3001/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('http://localhost:3001/dashboard');
    });

    test('Admin users page should have no accessibility violations', async () => {
      await page.goto('http://localhost:3001/admin/users');
      await injectAxe(page);

      const violations = await getViolations(page);

      if (violations.length > 0) {
        console.log('\n🚨 Accessibility Violations Found:\n');
        violations.forEach((violation, index) => {
          console.log(`${index + 1}. ${violation.id}: ${violation.description}`);
          console.log(`   Impact: ${violation.impact}`);
          console.log(`   Help: ${violation.helpUrl}`);
          console.log(`   Affected elements: ${violation.nodes.length}`);
          violation.nodes.forEach(node => {
            console.log(`     - ${node.html.substring(0, 100)}...`);
          });
          console.log('');
        });
      }

      expect(violations).toHaveLength(0);
    }, 30000);
  });

  describe('Accessibility Standards Compliance', () => {
    test('All pages should meet WCAG 2.1 Level AA standards', async () => {
      const pagesToTest = [
        { url: 'http://localhost:3001/', name: 'Home' },
        { url: 'http://localhost:3001/login', name: 'Login' },
        { url: 'http://localhost:3001/register', name: 'Registration' },
      ];

      const results = [];

      for (const pageInfo of pagesToTest) {
        await page.goto(pageInfo.url);
        await injectAxe(page);

        const violations = await getViolations(page, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
          },
        });

        results.push({
          page: pageInfo.name,
          violations: violations.length,
          issues: violations,
        });
      }

      // Report all violations
      const failedPages = results.filter(r => r.violations > 0);
      if (failedPages.length > 0) {
        console.log('\n📊 WCAG 2.1 AA Compliance Summary:\n');
        failedPages.forEach(result => {
          console.log(`❌ ${result.page}: ${result.violations} violations`);
          result.issues.forEach(issue => {
            console.log(`   - ${issue.id} (${issue.impact}): ${issue.description}`);
          });
        });
        console.log('');
      }

      expect(failedPages).toHaveLength(0);
    }, 60000);
  });

  describe('Specific Accessibility Checks', () => {
    test('Forms should have proper labels', async () => {
      await page.goto('http://localhost:3001/login');
      await injectAxe(page);

      const violations = await getViolations(page, {
        runOnly: {
          type: 'rule',
          values: ['label', 'label-title-only', 'label-content-name-mismatch'],
        },
      });

      expect(violations).toHaveLength(0);
    }, 30000);

    test('Pages should have proper heading hierarchy', async () => {
      await page.goto('http://localhost:3001/');
      await injectAxe(page);

      const violations = await getViolations(page, {
        runOnly: {
          type: 'rule',
          values: ['heading-order', 'page-has-heading-one'],
        },
      });

      expect(violations).toHaveLength(0);
    }, 30000);

    test('Color contrast should meet WCAG AA standards', async () => {
      await page.goto('http://localhost:3001/');
      await injectAxe(page);

      const violations = await getViolations(page, {
        runOnly: {
          type: 'rule',
          values: ['color-contrast'],
        },
      });

      expect(violations).toHaveLength(0);
    }, 30000);

    test('Interactive elements should be keyboard accessible', async () => {
      await page.goto('http://localhost:3001/');
      await injectAxe(page);

      const violations = await getViolations(page, {
        runOnly: {
          type: 'rule',
          values: ['button-name', 'link-name', 'tabindex'],
        },
      });

      expect(violations).toHaveLength(0);
    }, 30000);
  });
});
