# CATS Authentication System

Comprehensive documentation for the CATS authentication and authorization
system.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [User Roles](#user-roles)
- [User Registration & Approval](#user-registration--approval)
- [Authentication API](#authentication-api)
- [Admin User Management](#admin-user-management)
- [Middleware](#middleware)
- [Database Schema](#database-schema)
- [Testing](#testing)

## Overview

CATS implements session-based authentication using Passport.js with PostgreSQL
session storage. The system supports role-based access control (RBAC) with two
user roles: `admin` and `user`.

### Key Features

- **Session-based authentication** with secure cookie management
- **Role-based access control (RBAC)** for admin and user roles
- **User approval workflow** - new registrations require admin approval
- **Admin user management** - full CRUD operations for user accounts
- **Password hashing** using bcrypt
- **Database-backed sessions** using connect-pg-simple
- **Middleware protection** for routes and API endpoints

## Configuration

### Environment Variables

```bash
# Enable/disable authentication (default: false)
CATS_AUTH_ENABLED=true

# Session secret for cookie signing (required in production)
CATS_SESSION_SECRET=your-secure-random-secret

# JWT secret (currently unused, reserved for future token-based auth)
CATS_JWT_SECRET=your-jwt-secret
```

### Database Setup

Run migrations to create authentication tables:

```bash
npx sequelize-cli db:migrate
```

Create the initial admin user:

```bash
npx sequelize-cli db:seed --seed 20251005000001-admin-user.js
```

**Default Admin Credentials:**

- Email: `admin@example.com`
- Password: `admin123`

⚠️ **Change these credentials immediately in production!**

## User Roles

### Admin Role

Administrators have full system access including:

- Access to all user features
- User management dashboard at `/admin/users`
- Approve/reject pending user registrations
- Activate/deactivate user accounts
- Update user details and roles
- Delete user accounts

### User Role

Regular users can:

- Access dashboard and crawl features
- View their own crawl jobs and reports
- Update their own profile (future feature)

## User Registration & Approval

### Registration Flow

1. User submits registration form at `/register`
2. Account is created with `is_active: false`
3. User sees "pending approval" message
4. Admin receives notification (future feature)
5. Admin approves user via admin dashboard
6. User can now log in

### Registration Endpoint

**POST `/api/auth/register`**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**

```json
{
  "message": "Registration successful",
  "info": "Your account is pending approval. An administrator will review your request shortly.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Approval Requirement

- New users are created with `is_active: false`
- Users cannot log in until an admin approves their account
- Admins can approve users via the admin dashboard or API

## Authentication API

### Login

**POST `/api/auth/login`**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

**Error Responses:**

- **401** - Invalid credentials
- **403** - Account pending approval
- **403** - Account deactivated

### Logout

**POST `/api/auth/logout`**

Destroys the user's session and clears authentication cookies.

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

### Get Current User

**GET `/api/auth/user`**

Returns the currently authenticated user's information.

**Response (200):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "emailVerified": false,
  "isActive": true
}
```

## Admin User Management

Admin-only endpoints for managing users. All endpoints require authentication
and admin role.

### List Users

**GET `/api/admin/users`**

Query parameters:

- `search` - Filter by email or name
- `role` - Filter by role (`admin` or `user`)
- `status` - Filter by status (`active` or `inactive`)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)

**Response (200):**

```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "user",
      "is_active": true,
      "email_verified": false,
      "last_login_at": "2025-10-08T10:00:00Z",
      "created_at": "2025-10-01T10:00:00Z",
      "updated_at": "2025-10-08T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

### Get Pending Users

**GET `/api/admin/users/pending`**

Returns users awaiting approval.

**Response (200):**

```json
{
  "count": 5,
  "users": [
    {
      "id": "uuid",
      "email": "pending@example.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "role": "user",
      "is_active": false,
      "created_at": "2025-10-08T09:00:00Z"
    }
  ]
}
```

### Get User Details

**GET `/api/admin/users/:id`**

Returns detailed user information including recent crawl jobs.

**Response (200):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "is_active": true,
    "email_verified": false,
    "last_login_at": "2025-10-08T10:00:00Z",
    "created_at": "2025-10-01T10:00:00Z",
    "updated_at": "2025-10-08T10:00:00Z",
    "crawlJobs": [
      {
        "id": "uuid",
        "url": "https://example.com",
        "status": "completed",
        "created_at": "2025-10-08T09:00:00Z"
      }
    ]
  }
}
```

### Approve User

**PATCH `/api/admin/users/:id/approve`**

Activates a pending user account.

**Response (200):**

```json
{
  "message": "User approved successfully"
}
```

### Reject User

**PATCH `/api/admin/users/:id/reject`**

Deletes a pending user account.

**Response (200):**

```json
{
  "message": "User rejected and removed successfully"
}
```

### Toggle User Active Status

**PATCH `/api/admin/users/:id/toggle-active`**

Activates or deactivates a user account. Admins cannot deactivate their own
account.

**Response (200):**

```json
{
  "message": "User deactivated successfully",
  "isActive": false
}
```

### Update User

**PUT `/api/admin/users/:id`**

Updates user details. Admins cannot change their own role.

**Request:**

```json
{
  "email": "newemail@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "role": "admin"
}
```

**Response (200):**

```json
{
  "message": "User updated successfully"
}
```

**Error (400) - Duplicate Email:**

```json
{
  "error": "Email already in use"
}
```

**Error (400) - Self Role Change:**

```json
{
  "error": "Cannot change your own admin role"
}
```

### Delete User

**DELETE `/api/admin/users/:id`**

Permanently deletes a user account. Admins cannot delete their own account.

**Response (200):**

```json
{
  "message": "User deleted successfully"
}
```

**Error (400) - Self Deletion:**

```json
{
  "error": "Cannot delete your own account"
}
```

## Middleware

### requireAuth

Requires user to be authenticated. Redirects to `/login` if not authenticated.

```javascript
const { requireAuth } = require('./middleware/auth');

app.get('/dashboard', requireAuth, (req, res) => {
  // User is authenticated, req.user is available
});
```

### requireAdmin

Requires user to be authenticated AND have admin role. Returns 403 if not admin.

```javascript
const { requireAuth, requireAdmin } = require('./middleware/auth');

app.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
  // User is authenticated admin
});
```

### Bypass Mode

When `CATS_AUTH_ENABLED=false`, all middleware bypasses authentication checks.

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT false,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Session Table

Created automatically by connect-pg-simple:

```sql
CREATE TABLE session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IDX_session_expire ON session (expire);
```

## Testing

### Running Auth Tests

```bash
# Run all auth tests
npm test -- tests/__tests__/auth/

# Run specific test suites
npm test -- tests/__tests__/auth/authentication.test.js
npm test -- tests/__tests__/auth/authorization.test.js
npm test -- tests/__tests__/auth/admin-management.test.js
```

### Test Coverage

- **Authentication Tests** - Registration, login, logout flows
- **Authorization Tests** - Role-based access control
- **Admin Management Tests** - All admin user management endpoints
  - List/filter/search users
  - Approve/reject pending users
  - Activate/deactivate users
  - Update user details and roles
  - Delete users
  - Self-modification protection

### Test Users

Tests create these users in beforeEach:

```javascript
// Admin user
{ email: 'admin@example.com', role: 'admin', is_active: true }

// Regular user
{ email: 'user@example.com', role: 'user', is_active: true }

// Pending user
{ email: 'pending@example.com', role: 'user', is_active: false }
```

## Security Considerations

### Password Security

- Passwords are hashed using bcrypt with 10 salt rounds
- Plain-text passwords are never stored
- Password hashing happens in User model `beforeCreate` hook

### Session Security

- Sessions are signed with `CATS_SESSION_SECRET`
- Session data stored in PostgreSQL, not in cookies
- Cookies are HTTP-only and use secure flag in production
- Session expiry is managed by connect-pg-simple

### Admin Protection

- Admins cannot deactivate themselves
- Admins cannot delete themselves
- Admins cannot change their own role
- All admin operations require both authentication and admin role

### Input Validation

- Email format validation
- Password strength requirements (future enhancement)
- SQL injection protection via Sequelize ORM
- XSS protection via proper output encoding

## Future Enhancements

- [ ] Email verification workflow
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] Password strength requirements
- [ ] Rate limiting for login attempts
- [ ] Audit log for admin actions
- [ ] Email notifications for approvals
- [ ] User profile management
- [ ] OAuth/SSO integration
- [ ] Session timeout configuration
- [ ] Remember me functionality

## Troubleshooting

### Users Can't Log In

1. Check `CATS_AUTH_ENABLED=true` in environment
2. Verify database migrations have run
3. Check user's `is_active` status
4. Verify password is correct
5. Check session table exists

### Admin Seeder Fails

```bash
# Drop and recreate database
npx sequelize-cli db:drop
npx sequelize-cli db:create
npx sequelize-cli db:migrate
npx sequelize-cli db:seed --seed 20251005000001-admin-user.js
```

### Session Issues

```bash
# Clear all sessions
psql $DATABASE_URL -c "TRUNCATE TABLE session;"
```

### Tests Hanging

Tests may hang due to open database connections. The test suite uses
`--forceExit` to handle this, but you can also:

```bash
# Run with open handles detection
npm test -- --detectOpenHandles
```

## Related Files

- Models: `src/models/User.js`
- Routes: `src/routes/auth.js`, `src/routes/admin.js`
- Middleware: `src/middleware/auth.js`
- Templates: `src/templates/login.html`, `src/templates/register.html`,
  `src/templates/admin-users.html`
- Tests: `tests/__tests__/auth/`
- Migrations: `src/database/migrations/20251004000001-create-users.js`
- Seeders: `src/database/seeders/20251005000001-admin-user.js`
