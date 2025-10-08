# Authentication & Authorization

This document describes the authentication and authorization system implemented
in CATS (Crawl And Test Service).

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Authentication Flow](#authentication-flow)
- [Authorization Model](#authorization-model)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Job Ownership](#job-ownership)
- [Feature Flags](#feature-flags)
- [Security Considerations](#security-considerations)
- [Testing](#testing)

## Overview

CATS implements a session-based authentication system with role-based access
control (RBAC). The system supports:

- User registration and login
- Session persistence with secure cookies
- Password hashing with bcrypt
- Job ownership and data isolation
- Role-based permissions (user, admin)
- Feature flag for gradual rollout

## Architecture

### Tech Stack

- **Authentication**: Passport.js (Local Strategy)
- **Session Management**: express-session with connect-pg-simple
- **Password Hashing**: bcryptjs
- **Database**: PostgreSQL with Sequelize ORM
- **Authorization**: Custom middleware + model-level checks

### Components

```
┌─────────────────┐
│   Dashboard     │  Web UI (HTML + Express)
│   Server        │  Session-based auth
└────────┬────────┘
         │
    ┌────▼────┐
    │ Passport│  Authentication middleware
    └────┬────┘
         │
    ┌────▼────┐
    │ Models  │  User, CrawlJob
    └────┬────┘
         │
    ┌────▼────┐
    │PostgreSQL│  Data persistence
    └─────────┘
```

## User Roles

### User (default)

- Can register and login
- Can create crawl jobs
- Can view own jobs and reports
- Can cancel own jobs
- Cannot access other users' data

### Admin

- All user permissions
- Can view all jobs and reports (system-wide)
- Can cancel any job
- Can manage users (Week 5+)

## Authentication Flow

### Registration

```javascript
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Process:**

1. Validate input (email format, password strength)
2. Check for duplicate email
3. Hash password with bcrypt (10 rounds)
4. Create user record with `role: 'user'` and `is_active: true`
5. Return success message

**Response:**

```json
{
  "success": true,
  "message": "Registration successful"
}
```

### Login

```javascript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Process:**

1. Find user by email
2. Validate password with bcrypt.compare()
3. Update `last_login_at` timestamp
4. Create session (Passport serialization)
5. Set secure session cookie
6. Return user object (excluding password_hash)

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true
  }
}
```

### Logout

```javascript
POST / api / auth / logout;
```

**Process:**

1. Destroy session
2. Clear cookies
3. Return success

## Authorization Model

### Middleware

#### `requireAuth`

Protects routes - requires valid session or JWT token.

```javascript
// Protected route example
app.get('/dashboard', requireAuth, (req, res) => {
  // req.user is populated
});
```

#### `requireAdmin`

Requires authenticated user with `role === 'admin'`.

```javascript
// Admin-only route
app.get('/admin/users', requireAdmin, (req, res) => {
  // Only admins can access
});
```

### Protected Routes

| Route                  | Auth Required | Notes                              |
| ---------------------- | ------------- | ---------------------------------- |
| `/`                    | No            | Public home page                   |
| `/login`               | No            | Login page                         |
| `/register`            | No            | Registration page                  |
| `/dashboard`           | Yes           | User dashboard                     |
| `/crawl`               | Yes           | Start new crawl                    |
| `/reports/`            | Yes           | View reports                       |
| `/browse/:domain`      | Yes           | Domain-specific reports            |
| `/api/jobs`            | Yes           | Job listings (filtered by user)    |
| `/api/reports`         | Yes           | Report listings (filtered by user) |
| `/api/stats`           | Yes           | User-specific or admin stats       |
| `POST /crawl`          | Yes           | Create job                         |
| `DELETE /api/jobs/:id` | Yes           | Cancel job (owner or admin only)   |

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`

Register a new user.

**Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`

---

#### POST `/api/auth/login`

Login with email and password.

**Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK` with session cookie

---

#### POST `/api/auth/logout`

Logout and destroy session.

**Response:** `200 OK`

---

### Job Endpoints

#### GET `/api/jobs`

Get jobs for current user (or all jobs if admin).

**Response:**

```json
{
  "active": [...],
  "queued": [...],
  "allJobs": [
    {
      "jobId": "uuid",
      "domain": "example.com",
      "status": "completed",
      "created_at": "2025-10-07T..."
    }
  ],
  "stats": {...}
}
```

---

#### POST `/crawl`

Create a new crawl job (associated with current user).

**Body:**

```json
{
  "url": "https://example.com",
  "wcagVersion": "2.1",
  "wcagLevel": "AA",
  "maxDepth": 2,
  "maxPages": 50
}
```

**Response:**

```json
{
  "success": true,
  "jobId": "uuid",
  "status": "running"
}
```

---

#### DELETE `/api/jobs/:jobId`

Cancel a job (owner or admin only).

**Authorization:** User must own the job OR be an admin

**Response:**

```json
{
  "success": true,
  "message": "Job cancelled"
}
```

**Error Responses:**

- `403 Forbidden` - Not authorized to cancel this job
- `404 Not Found` - Job not found

---

#### GET `/api/stats`

Get job statistics for current user (or system-wide if admin).

**Response:**

```json
{
  "total": 42,
  "running": 2,
  "completed": 35,
  "failed": 5
}
```

---

#### GET `/api/reports`

Get reports for domains user has crawled.

**Response:**

```json
[
  {
    "domain": "example.com",
    "reportCount": 5,
    "lastReport": "2025-10-07T..."
  }
]
```

## Database Schema

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### crawl_jobs

```sql
CREATE TABLE crawl_jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  domain VARCHAR(255) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('queued', 'running', 'completed', 'error', 'cancelled', 'timeout')),
  options JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error TEXT
);

CREATE INDEX idx_crawl_jobs_user_id ON crawl_jobs(user_id);
CREATE INDEX idx_crawl_jobs_domain ON crawl_jobs(domain);
CREATE INDEX idx_crawl_jobs_status ON crawl_jobs(status);
```

## Job Ownership

### Job Creation

When a user creates a crawl job:

1. Job record created with `user_id: req.user.id`
2. Job stored in database immediately
3. Job also tracked in-memory for real-time updates

### Job Filtering

Users see only their own jobs:

```javascript
// Regular user
const jobs = await CrawlJob.findAll({
  where: { user_id: req.user.id },
});

// Admin
const jobs = await CrawlJob.findAll(); // All jobs
```

### Job Authorization

Before cancelling a job, check ownership:

```javascript
const job = await CrawlJob.findByPk(jobId);

if (!job.canUserModify(req.user.id, req.user.role)) {
  return res.status(403).json({ error: 'Not authorized' });
}
```

### Report Filtering

Reports are filtered based on job ownership:

- Users see reports only for domains they've crawled
- Admins see all reports

```javascript
const userJobs = await CrawlJob.findAll({
  where: { user_id: req.user.id },
  attributes: ['domain'],
  group: ['domain'],
});

const userDomains = new Set(userJobs.map(j => j.domain));
const filteredReports = allReports.filter(r => userDomains.has(r.domain));
```

## Feature Flags

### `CATS_AUTH_ENABLED`

Controls whether authentication is enforced.

**Values:**

- `true` - Authentication required (production mode)
- `false` - No authentication (development/testing)

**Usage:**

```bash
# Enable authentication
export CATS_AUTH_ENABLED=true

# Disable authentication (open access)
export CATS_AUTH_ENABLED=false
```

**Behavior when disabled:**

- All routes are publicly accessible
- No job filtering (all users see all jobs)
- No authorization checks
- Useful for development and testing

## Security Considerations

### Password Security

- Passwords hashed with bcrypt (10 rounds)
- Minimum password requirements enforced client-side
- Password never stored in plain text
- Password hash never returned in API responses

### Session Security

- Secure cookies (httpOnly, sameSite: 'lax')
- Session stored in PostgreSQL (not memory)
- Session timeout: 7 days (configurable)
- CSRF protection recommended (future enhancement)

### SQL Injection Prevention

- Sequelize ORM with parameterized queries
- Input validation on all endpoints
- No raw SQL queries

### XSS Prevention

- HTML escaping in templates
- Content-Security-Policy headers (recommended)
- No inline JavaScript in user-generated content

### Authorization Bypass Prevention

- All protected routes use `requireAuth` middleware
- Job ownership checked at model level
- Admin role verified for sensitive operations
- Feature flag checked on every request

### Rate Limiting

- Not yet implemented (future enhancement)
- Recommended for login endpoint to prevent brute force

## Testing

### Test Files

- `tests/__tests__/auth/authentication.test.js` - User registration, login,
  logout
- `tests/__tests__/auth/authorization.test.js` - Route protection, job
  ownership, RBAC

### Running Tests

```bash
# Run all auth tests
npm test -- tests/__tests__/auth/

# Run specific test file
npm test -- tests/__tests__/auth/authentication.test.js

# Run with coverage
npm run test:coverage
```

### Test Database Setup

Tests require PostgreSQL:

```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run migrations
npm run db:migrate:test

# Run tests
npm test
```

### Test Coverage

Authentication tests cover:

- ✅ User registration (success, validation, duplicates)
- ✅ User login (success, wrong password, invalid email)
- ✅ User logout (session clearing)
- ✅ Password hashing
- ✅ Session persistence

Authorization tests cover:

- ✅ Route protection (unauthenticated access blocked)
- ✅ Job ownership (users see only their jobs)
- ✅ Job cancellation (authorization checks)
- ✅ Report filtering (by user)
- ✅ Admin access (all jobs/reports)
- ✅ Role-based permissions
- ✅ Feature flag behavior

## Future Enhancements

See `.planning` document for planned features:

**Phase 1A Week 5:**

- User approval workflow (admin approval for new registrations)
- Admin user management interface
- User activation/deactivation
- Audit logging

**Phase 1B:**

- OAuth 2.0 integration (Google, GitHub)
- Two-factor authentication (TOTP)
- Password reset flow
- Email verification
- API key generation
- Remember me functionality
- Account lockout after failed attempts

**Phase 2:**

- Organization/team structure
- Multi-tenancy
- Organization-level report visibility settings
- Team-based permissions

## Support

For issues or questions about authentication:

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for setup instructions
- Review [.planning](.planning) for implementation roadmap
- Report bugs at https://github.com/iamjolly/crawl-and-test/issues
