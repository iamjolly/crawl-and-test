# Testing Guide

This guide covers setting up and running tests for the CATS application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Test Database Setup](#test-database-setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 22.x or 24.x
- PostgreSQL 16 (via Docker Compose recommended)
- npm dependencies installed (`npm install`)

---

## Test Database Setup

### Using Docker Compose (Recommended)

If you're using the provided `docker-compose.dev.yml`:

1. **Start PostgreSQL:**

   ```bash
   docker compose -f docker-compose.dev.yml up -d postgres
   ```

2. **Create test database:**

   ```bash
   docker exec crawl-and-test-postgres-1 psql -U cats_user postgres -c "CREATE DATABASE cats_test OWNER cats_user;"
   ```

3. **Run migrations on test database:**

   ```bash
   NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate
   ```

4. **Verify setup:**

   ```bash
   docker exec crawl-and-test-postgres-1 psql -U cats_user -d cats_test -c "\dt"
   ```

   You should see tables: `users`, `sessions`, `crawl_jobs`, `audit_logs`,
   `completed_jobs`

### Using Local PostgreSQL

If you have PostgreSQL installed locally:

1. **Create test database:**

   ```bash
   createdb -O cats_user cats_test
   ```

2. **Run migrations:**
   ```bash
   NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate
   ```

### Environment Variables

The test suite uses these database settings (configured in `tests/setup.js`):

```javascript
CATS_DB_HOST = localhost;
CATS_DB_PORT = 5432;
CATS_DB_NAME = cats_test;
CATS_DB_USER = cats_user;
CATS_DB_PASSWORD = cats_password;
```

You can override these by setting environment variables before running tests.

---

## Running Tests

### Run All Tests

```bash
npm test
```

This runs the entire test suite with Jest.

### Run Specific Test File

```bash
npm test -- tests/__tests__/auth/authentication.test.js
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="login"
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Tests with Verbose Output

```bash
npm test -- --verbose
```

---

## Test Structure

```
tests/
├── __tests__/
│   ├── accessibility/
│   │   └── page-accessibility.test.js    # Accessibility scanning tests
│   ├── auth/
│   │   ├── admin-management.test.js      # Admin user management tests
│   │   ├── authentication.test.js        # Login/logout/registration tests
│   │   └── authorization.test.js         # Route protection tests
│   ├── core/
│   │   ├── config.test.js                # Configuration tests
│   │   └── redirect-handling.test.js     # HTTP redirect tests
│   ├── utils/
│   │   └── password-validator.test.js    # Password validation tests
│   ├── basic-functionality.test.js       # Basic smoke tests
│   └── sample.test.js                    # Example test file
├── fixtures/
│   └── reports/                          # Test report fixtures
└── setup.js                              # Global test setup
```

---

## Test Statistics

Current test suite status:

- **Total Test Suites:** 9
- **Total Tests:** 115
- **Typical Runtime:** ~30-35 seconds

### Test Breakdown by Category

| Category       | Test Files | Test Count | Focus                                         |
| -------------- | ---------- | ---------- | --------------------------------------------- |
| Authentication | 3          | ~50        | User auth, admin management, route protection |
| Core           | 2          | ~15        | Config, redirects                             |
| Accessibility  | 1          | ~30        | Page scanning, WCAG compliance                |
| Utils          | 1          | ~10        | Password validation                           |
| Other          | 2          | ~10        | Basic functionality, samples                  |

---

## Writing Tests

### Test Template

```javascript
const request = require('supertest');
const { sequelize } = require('../../src/models');

describe('Feature Name', () => {
  let app;

  beforeAll(async () => {
    // Setup - runs once before all tests
    app = require('../../src/servers/dashboard');
    await sequelize.sync({ force: false });
  });

  afterAll(async () => {
    // Cleanup - runs once after all tests
    await sequelize.close();
  });

  beforeEach(async () => {
    // Setup - runs before each test
  });

  afterEach(async () => {
    // Cleanup - runs after each test
  });

  describe('Specific functionality', () => {
    it('should do something', async () => {
      const response = await request(app).get('/api/endpoint').expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });
});
```

### Best Practices

1. **Use Descriptive Test Names**

   ```javascript
   // Good
   it('should return 401 when user is not authenticated', ...)

   // Bad
   it('test auth', ...)
   ```

2. **Clean Up After Tests**
   - Always close database connections in `afterAll`
   - Delete test data created during tests
   - Reset any global state

3. **Use Supertest Agent for Session Tests**

   ```javascript
   const agent = request.agent(app);
   await agent.post('/api/auth/login').send({ email, password });
   // Agent maintains session cookies
   await agent.get('/api/protected-route').expect(200);
   ```

4. **Create Test Users with is_active: true**

   ```javascript
   const user = await User.create({
     email: 'test@example.com',
     password_hash: await bcrypt.hash('password', 10),
     is_active: true, // Important! New users default to inactive
   });
   ```

5. **Use Test Utilities**
   ```javascript
   // Available in all tests via global.testUtils
   const mockUrl = testUtils.createMockUrl('example.com', '/page');
   const mockViolation = testUtils.createMockViolation(
     'color-contrast',
     'serious'
   );
   const mockAxeResults = testUtils.createMockAxeResults(5);
   ```

---

## CI/CD

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

### GitHub Actions Workflow

The CI pipeline:

1. Checks out code
2. Sets up Node.js (matrix: 22.x, 24.x)
3. Installs dependencies
4. Installs Playwright browsers
5. Runs linting
6. **Runs database migrations** (creates test schema)
7. **Runs tests** (115 tests)
8. Runs security audit

### CI Environment

In CI, the test database is created automatically by GitHub Actions:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_DB: cats_test
```

Migrations are run before tests to ensure schema is up to date.

---

## Troubleshooting

### Error: `database "cats_test" does not exist`

**Solution:** Create the test database:

```bash
# Using Docker
docker exec crawl-and-test-postgres-1 psql -U cats_user postgres -c "CREATE DATABASE cats_test OWNER cats_user;"

# Using local PostgreSQL
createdb -O cats_user cats_test

# Then run migrations
NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate
```

### Error: `relation "users" does not exist`

**Solution:** Run migrations on test database:

```bash
NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate
```

### Error: Tests timing out

**Solution:** Increase Jest timeout in test file:

```javascript
jest.setTimeout(60000); // 60 seconds
```

Default timeout is 30 seconds (set in `tests/setup.js`).

### Error: `Port 3001 already in use`

**Solution:** Stop any running instances of the app:

```bash
# Find process
lsof -i :3001

# Kill process
kill -9 <PID>
```

Or change test port in `tests/setup.js`:

```javascript
process.env.CATS_SERVER_PORT = '3002';
```

### Error: Tests failing after schema changes

**Solution:**

1. Drop and recreate test database:

   ```bash
   docker exec crawl-and-test-postgres-1 psql -U cats_user postgres -c "DROP DATABASE cats_test;"
   docker exec crawl-and-test-postgres-1 psql -U cats_user postgres -c "CREATE DATABASE cats_test OWNER cats_user;"
   ```

2. Run all migrations:

   ```bash
   NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate
   ```

3. Run tests:
   ```bash
   npm test
   ```

### Error: `Cannot find module` errors

**Solution:** Reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

### PostgreSQL Connection Issues

**Check if PostgreSQL is running:**

```bash
docker ps --filter "name=postgres"
```

**Check if you can connect:**

```bash
docker exec crawl-and-test-postgres-1 psql -U cats_user -d cats_test -c "SELECT 1;"
```

**Restart PostgreSQL:**

```bash
docker compose -f docker-compose.dev.yml restart postgres
```

---

## Database Migrations in Tests

### What Happens During Tests

1. **Setup (before tests):** Test database `cats_test` must exist with schema
2. **Tests:** Each test suite may create/delete test data
3. **Cleanup (after tests):** Data is cleaned up, schema remains

### Running Migrations

Migrations should be run **once** after creating the test database:

```bash
NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate
```

### Reverting Migrations

To undo all migrations:

```bash
NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate:undo:all
```

### Creating New Migrations

When adding new migrations, remember to:

1. Create migration file:

   ```bash
   npx sequelize-cli migration:generate --name add-new-feature
   ```

2. Test migration on test database:

   ```bash
   NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate
   ```

3. Update tests if schema changes affect them

4. Document schema changes in migration file

---

## Test Data Management

### Creating Test Users

Always set `is_active: true` for test users:

```javascript
const testUser = await User.create({
  email: 'test@example.com',
  password_hash: await bcrypt.hash('password123', 10),
  first_name: 'Test',
  last_name: 'User',
  role: 'user',
  is_active: true, // Required for login
});
```

### Creating Test Admin

```javascript
const adminUser = await User.create({
  email: 'admin@example.com',
  password_hash: await bcrypt.hash('adminpass123', 10),
  role: 'admin',
  is_active: true,
});
```

### Cleaning Up Test Data

```javascript
afterEach(async () => {
  // Clean up test data
  await User.destroy({ where: { email: { [Op.like]: '%@example.com' } } });
  await CrawlJob.destroy({ where: {} });
  await CompletedJob.destroy({ where: {} });
});
```

---

## Performance Tips

1. **Use `--runInBand` for sequential tests:**
   - Already configured in `package.json` script
   - Prevents race conditions with database

2. **Use `--forceExit` to prevent hanging:**
   - Already configured
   - Ensures tests don't hang on open handles

3. **Keep test database small:**
   - Clean up data after tests
   - Only create data needed for specific test

4. **Use transactions for isolation (advanced):**

   ```javascript
   let transaction;

   beforeEach(async () => {
     transaction = await sequelize.transaction();
   });

   afterEach(async () => {
     await transaction.rollback();
   });
   ```

---

## Useful Commands Summary

```bash
# Create test database
docker exec crawl-and-test-postgres-1 psql -U cats_user postgres -c "CREATE DATABASE cats_test OWNER cats_user;"

# Run migrations
NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate

# Run all tests
npm test

# Run specific test file
npm test -- tests/__tests__/auth/authentication.test.js

# Run tests with coverage
npm test -- --coverage

# Check test database schema
docker exec crawl-and-test-postgres-1 psql -U cats_user -d cats_test -c "\dt"

# Reset test database
docker exec crawl-and-test-postgres-1 psql -U cats_user postgres -c "DROP DATABASE cats_test;"
docker exec crawl-and-test-postgres-1 psql -U cats_user postgres -c "CREATE DATABASE cats_test OWNER cats_user;"
NODE_ENV=test CATS_DB_NAME=cats_test npx sequelize-cli db:migrate
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Sequelize Testing Guide](https://sequelize.org/docs/v6/other-topics/testing/)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Last Updated:** October 17, 2025 **Test Suite Version:** 115 tests across 9
suites
