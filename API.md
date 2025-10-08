# CATS API Documentation

API documentation for the CATS (Crawl And Test Service) accessibility testing
platform.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Jobs](#job-endpoints)
  - [Reports](#report-endpoints)
  - [Statistics](#statistics-endpoints)

## Overview

CATS provides a RESTful API for managing accessibility testing jobs, viewing
results, and managing user accounts. All API endpoints return JSON responses
unless otherwise specified.

**Current Version:** 1.0 **API Type:** REST **Authentication:** Session-based
with cookies

## Base URL

```
Local Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

Most endpoints require authentication via session cookies. Include credentials
in requests:

```javascript
fetch('/api/jobs', {
  credentials: 'include', // Important for session cookies
});
```

### Authentication Flow

1. **Register** or **Login** to get a session cookie
2. **Include cookie in subsequent requests** (automatic in browsers)
3. **Logout** to destroy session

See [AUTH.md](AUTH.md) for detailed authentication documentation.

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response payload
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Error Handling

### HTTP Status Codes

| Code | Description                            |
| ---- | -------------------------------------- |
| 200  | Success                                |
| 201  | Created                                |
| 400  | Bad Request - Invalid input            |
| 401  | Unauthorized - Authentication required |
| 403  | Forbidden - Insufficient permissions   |
| 404  | Not Found - Resource doesn't exist     |
| 500  | Internal Server Error                  |

### Common Error Messages

```json
{
  "success": false,
  "error": "Authentication required"
}
```

```json
{
  "success": false,
  "error": "Not authorized to access this resource"
}
```

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

## Rate Limiting

Currently not implemented. Future enhancement planned for:

- Login endpoint: 5 attempts per 15 minutes
- Job creation: 10 jobs per hour per user
- API requests: 100 requests per minute

## Endpoints

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register` **Authentication:** None required **Rate
Limit:** 5 registrations per hour per IP (planned)

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

| Field     | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| email     | string | Yes      | Valid email address, must be unique |
| password  | string | Yes      | Minimum 8 characters                |
| firstName | string | No       | User's first name                   |
| lastName  | string | No       | User's last name                    |

#### Success Response

**Code:** `201 Created`

```json
{
  "success": true,
  "message": "Registration successful. Please log in."
}
```

#### Error Responses

**Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Email already exists"
}
```

```json
{
  "success": false,
  "error": "Invalid email format"
}
```

```json
{
  "success": false,
  "error": "Password is required"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

---

### Login

Authenticate and create a session.

**Endpoint:** `POST /api/auth/login` **Authentication:** None required

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

| Field    | Type   | Required | Description              |
| -------- | ------ | -------- | ------------------------ |
| email    | string | Yes      | Registered email address |
| password | string | Yes      | User's password          |

#### Success Response

**Code:** `200 OK`

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "emailVerified": false,
    "lastLoginAt": "2025-10-07T20:30:00.000Z",
    "createdAt": "2025-10-01T10:00:00.000Z"
  }
}
```

**Note:** Sets `connect.sid` session cookie (httpOnly, secure in production)

#### Error Responses

**Code:** `401 Unauthorized`

```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Email and password are required"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

---

### Logout

End the current session.

**Endpoint:** `POST /api/auth/logout` **Authentication:** Required

#### Success Response

**Code:** `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

---

## Job Endpoints

### Get Jobs

Retrieve crawl jobs for the authenticated user (or all jobs if admin).

**Endpoint:** `GET /api/jobs` **Authentication:** Required

#### Query Parameters

None

#### Success Response

**Code:** `200 OK`

```json
{
  "active": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "url": "https://example.com",
      "status": "running",
      "wcagVersion": "2.1",
      "wcagLevel": "AA",
      "maxDepth": 2,
      "maxPages": 50,
      "createdTime": "2025-10-07T20:00:00.000Z",
      "startTime": "2025-10-07T20:00:05.000Z"
    }
  ],
  "queued": [],
  "allJobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "domain": "example.com",
      "status": "completed",
      "options": {
        "url": "https://example.com",
        "wcagVersion": "2.1",
        "wcagLevel": "AA",
        "maxDepth": 2,
        "maxPages": 50
      },
      "created_at": "2025-10-07T20:00:00.000Z",
      "started_at": "2025-10-07T20:00:05.000Z",
      "completed_at": "2025-10-07T20:05:30.000Z",
      "error": null
    }
  ],
  "stats": {
    "running": 1,
    "maxConcurrent": 3,
    "canStartNew": true,
    "totalActive": 1,
    "totalQueued": 0
  },
  "browserPool": {
    "active": 2,
    "idle": 0,
    "max": 2
  },
  "performance": {
    "environment": "Local",
    "pageTimeout": 90000,
    "maxRetries": 3,
    "waitStrategy": "domcontentloaded",
    "disableImages": true
  }
}
```

#### Notes

- Regular users see only their own jobs in `allJobs`
- Admins see all jobs system-wide
- `active` and `queued` arrays contain currently running/queued jobs
- `allJobs` contains historical data from database

#### Example

```bash
curl http://localhost:3000/api/jobs \
  -b cookies.txt
```

---

### Create Job

Start a new accessibility crawl.

**Endpoint:** `POST /crawl` **Authentication:** Required

#### Request Body

```json
{
  "url": "https://example.com",
  "wcagVersion": "2.1",
  "wcagLevel": "AA",
  "maxDepth": 2,
  "maxPages": 50,
  "crawlerConcurrency": 4
}
```

| Field              | Type   | Required | Default | Description                                             |
| ------------------ | ------ | -------- | ------- | ------------------------------------------------------- |
| url                | string | Yes      | -       | Full URL to crawl (must start with http:// or https://) |
| wcagVersion        | string | No       | "2.1"   | WCAG version: "2.0", "2.1", or "2.2"                    |
| wcagLevel          | string | No       | "AA"    | Conformance level: "A", "AA", or "AAA"                  |
| maxDepth           | number | No       | 2       | Maximum link depth to crawl                             |
| maxPages           | number | No       | 50      | Maximum number of pages to scan                         |
| crawlerConcurrency | number | No       | 4       | Number of concurrent browsers                           |

#### Success Response

**Code:** `200 OK`

```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "queuePosition": 0
}
```

**Status Values:**

- `running` - Job started immediately
- `queued` - Job queued (max concurrent jobs reached)

#### Error Responses

**Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": "URL is required"
}
```

**Code:** `401 Unauthorized`

```json
{
  "success": false,
  "error": "User not authenticated"
}
```

#### Example

```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "url": "https://example.com",
    "wcagVersion": "2.1",
    "wcagLevel": "AA",
    "maxDepth": 2,
    "maxPages": 50
  }'
```

---

### Cancel Job

Cancel a running or queued job.

**Endpoint:** `DELETE /api/jobs/:jobId` **Authentication:** Required
**Authorization:** User must own the job OR be an admin

#### URL Parameters

| Parameter | Type | Description                 |
| --------- | ---- | --------------------------- |
| jobId     | UUID | The ID of the job to cancel |

#### Success Response

**Code:** `200 OK`

```json
{
  "success": true,
  "message": "Running job cancelled"
}
```

or

```json
{
  "success": true,
  "message": "Queued job cancelled"
}
```

#### Error Responses

**Code:** `403 Forbidden`

```json
{
  "success": false,
  "error": "Not authorized to cancel this job"
}
```

**Code:** `404 Not Found`

```json
{
  "success": false,
  "error": "Job not found"
}
```

**Code:** `400 Bad Request`

```json
{
  "success": false,
  "error": "Job cannot be cancelled (already completed or in error state)"
}
```

#### Example

```bash
curl -X DELETE http://localhost:3000/api/jobs/550e8400-e29b-41d4-a716-446655440000 \
  -b cookies.txt
```

---

## Report Endpoints

### Get Reports

List available report directories for domains the user has crawled.

**Endpoint:** `GET /api/reports` **Authentication:** Required

#### Success Response

**Code:** `200 OK`

```json
[
  {
    "domain": "example.com",
    "reportCount": 5,
    "lastReport": "example.com_wcag2.1_AA_2025-10-07T20-05-30.html",
    "reportFiles": [
      "example.com_wcag2.1_AA_2025-10-07T20-05-30.html",
      "example.com_wcag2.1_AA_2025-10-06T15-22-10.html"
    ]
  },
  {
    "domain": "test.org",
    "reportCount": 2,
    "lastReport": "test.org_wcag2.1_AA_2025-10-05T10-00-00.html",
    "reportFiles": ["test.org_wcag2.1_AA_2025-10-05T10-00-00.html"]
  }
]
```

#### Notes

- Regular users see only domains they've crawled
- Admins see all domains
- Reports are sorted by most recent first

#### Example

```bash
curl http://localhost:3000/api/reports \
  -b cookies.txt
```

---

## Statistics Endpoints

### Get Statistics

Get job statistics for the authenticated user (or system-wide for admins).

**Endpoint:** `GET /api/stats` **Authentication:** Required

#### Success Response

**Code:** `200 OK`

For regular user:

```json
{
  "total": 42,
  "running": 2,
  "completed": 35,
  "failed": 5
}
```

For admin (system-wide stats):

```json
{
  "total": 523,
  "running": 12,
  "completed": 487,
  "failed": 24
}
```

#### Field Descriptions

| Field     | Description                  |
| --------- | ---------------------------- |
| total     | Total number of jobs created |
| running   | Currently running jobs       |
| completed | Successfully completed jobs  |
| failed    | Jobs that failed with errors |

#### Example

```bash
curl http://localhost:3000/api/stats \
  -b cookies.txt
```

---

## Web Pages (HTML)

These endpoints return HTML pages instead of JSON.

### Dashboard

**Endpoint:** `GET /dashboard` **Authentication:** Required

Returns the main dashboard page with job statistics and recent activity.

---

### Start Crawl Form

**Endpoint:** `GET /crawl` **Authentication:** Required

Returns the form for starting a new crawl.

---

### Reports Index

**Endpoint:** `GET /reports/` **Authentication:** Required

Returns HTML page listing all available reports (filtered by user).

---

### Domain Reports

**Endpoint:** `GET /browse/:domain` **Authentication:** Required (planned)

Returns HTML page showing all reports for a specific domain.

**Example:** `GET /browse/example.com`

---

## Feature Flags

### CATS_AUTH_ENABLED

When set to `false`, authentication is disabled and all endpoints are publicly
accessible.

```bash
# Disable auth (development)
export CATS_AUTH_ENABLED=false

# Enable auth (production)
export CATS_AUTH_ENABLED=true
```

**Impact when disabled:**

- All routes accessible without login
- No job/report filtering
- No authorization checks

---

## Versioning

Currently no API versioning. Breaking changes will be communicated via:

- GitHub releases
- CHANGELOG.md
- Migration guides

Future versions may use URL versioning: `/api/v2/jobs`

---

## Support

For API questions or issues:

- Check [AUTH.md](AUTH.md) for authentication details
- See [DEVELOPMENT.md](DEVELOPMENT.md) for local setup
- Report bugs: https://github.com/iamjolly/crawl-and-test/issues

---

## Changelog

### Version 1.0.0 (Phase 1A Week 4)

- ✅ Session-based authentication
- ✅ User registration and login
- ✅ Job ownership and filtering
- ✅ Report filtering by user
- ✅ Role-based access control (user, admin)
- ✅ Job cancellation with authorization
- ✅ User-specific statistics

### Planned Features

See [.planning](.planning) for roadmap:

- User approval workflow (Week 5)
- Admin user management (Week 5)
- OAuth 2.0 integration (Phase 1B)
- API key authentication (Phase 1B)
- Organization multi-tenancy (Phase 2)
