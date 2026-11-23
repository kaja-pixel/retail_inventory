# SkillForge Retail Inventory & Stock Management

A full-stack React and TypeScript retail inventory and stock management web application powered by an Express REST API and PostgreSQL.

---

## 🚀 Key Features

- **Authentication & RBAC:** Role-Based Access Control (`SUPER_ADMIN`, `ADMIN`, `STAFF`) with bcrypt-hashed passwords, JWT tokens, and Google OAuth 2.0 integration.
- **Product Management:** Full CRUD capabilities with automated SKU uppercase normalization, category association, pricing constraints, and low-stock threshold management.
- **Inventory & Stock Adjustments:** Atomic stock updates (`FOR UPDATE` locking), direction-validated adjustments (`RESTOCK`, `DAMAGE`, `LOSS`, `SALE`, `RETURN`, `ADJUSTMENT`), and transaction audit trails.
- **Low-Stock & Out-of-Stock Notifications:** Automatic threshold monitoring with 24-hour intelligent notification deduplication.
- **Analytics Dashboard:** Live product metrics, stock counts, monetary valuation calculations, and category breakdowns.
- **Request Tracking & Structured Logging:** Unique `X-Request-ID` generated for every API request, propagated to response headers and structured Winston JSON logs.
- **Automated Testing Suite:** 36 automated Vitest & Supertest integration test cases executing against an isolated PostgreSQL test database.
- **Continuous Integration:** GitHub Actions workflow executing PostgreSQL schema initialization, backend tests, and frontend build verification.

---

## 📋 Prerequisites

- **Node.js:** v20+ or v24+
- **npm:** v9+
- **PostgreSQL:** v14+ (v16 recommended)
- **Git**

---

## 🛠️ Local Environment & Database Setup

### 1. Database Configuration

The application uses two separate PostgreSQL databases to ensure automated tests never interfere with development or production data:
- **Development Database:** `skillforge_inventory_db`
- **Testing Database:** `skillforge_inventory_test_db`

Initialize both databases:

```powershell
# Create Development Database
psql -U postgres -c "CREATE DATABASE skillforge_inventory_db;"
psql -U postgres -d skillforge_inventory_db -f database/schema.sql
psql -U postgres -d skillforge_inventory_db -f database/seed.sql

# Create Dedicated Testing Database
psql -U postgres -c "CREATE DATABASE skillforge_inventory_test_db;"
psql -U postgres -d skillforge_inventory_test_db -f database/schema.sql
psql -U postgres -d skillforge_inventory_test_db -f database/seed.sql
```

### 2. Environment Variables

Configure `backend/.env` for development:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Development Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skillforge_inventory_db
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/skillforge_inventory_db

# Testing Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=skillforge_inventory_test_db
TEST_DB_USER=postgres
TEST_DB_PASSWORD=your_password
TEST_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/skillforge_inventory_test_db

JWT_SECRET=your_jwt_secret_at_least_32_characters_long
JWT_EXPIRES_IN=7d
```

Configure `backend/.env.test` for automated testing:

```env
NODE_ENV=test
PORT=5001
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=skillforge_inventory_test_db
DB_USER=postgres
DB_PASSWORD=your_password
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/skillforge_inventory_test_db
TEST_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/skillforge_inventory_test_db

JWT_SECRET=test-super-secret-key-that-is-at-least-32-chars-long
JWT_EXPIRES_IN=1d
```

---

## 🧪 Automated Testing

Automated tests are located in `backend/src/tests/` and built with **Vitest** and **Supertest**.

### Run Tests in a Single Command

```powershell
cd backend
npm test
```

### Test Coverage Highlights (36 Tests)
1. **Authentication:** Registration, password validation, duplicate email rejection, login, JWT verification, logout, default `STAFF` role assignment, and Google auth rejection.
2. **Authorization (RBAC):** Unauthenticated protection, Staff access restriction, and Admin self-privilege escalation prevention.
3. **Product Management:** CRUD operations, duplicate SKU validation (case-insensitive), negative price/stock validation, non-existent UUID / integer handling, pagination, search, and sorting.
4. **Inventory Management:** Atomic stock adjustments, stock deduction guards (prevent negative stock), transaction log generation, low-stock identification, and out-of-stock filtering.
5. **Additional Features & Incident Regressions:** Notification mark-as-read, dashboard metrics calculation, audit trail generation, Request ID header verification, case-insensitive SKU collision prevention, directional adjustment validation, and notification deduplication.

Detailed test cases and status are documented in [docs/TEST_PLAN.md](file:///docs/TEST_PLAN.md).

---

## 🛡️ Database Safety Safeguards

To prevent accidental destruction of production or development data:
- The backend configuration validates the connected database name whenever `NODE_ENV === 'test'`. If the database name does not contain `test` or end in `_test_db`, execution immediately halts with a fatal safety exception:
  ```typescript
  if (config.nodeEnv === 'test') {
    if (!config.database.name.includes('test') && !config.database.name.endsWith('_test_db')) {
      throw new Error(`CRITICAL SAFETY ERROR: Automated tests attempted to connect to non-test database: "${config.database.name}". Test execution halted.`);
    }
  }
  ```
- Before each test suite, tables are reset and reseoded in `skillforge_inventory_test_db` exclusively.

---

## 🔍 Request ID & Structured Logging

### 1. Request ID Middleware
Every incoming API request is assigned a unique Request ID (either from client `X-Request-ID` or generated as `req-<hex>`). The header is attached to the Express request and returned in all responses:
```http
X-Request-ID: req-a8f21c9d
```

### 2. Structured JSON Logs (Winston)
Application activity and error diagnostics are emitted in structured JSON format without exposing sensitive credentials, tokens, or passwords:
```json
{
  "timestamp": "2026-11-23T08:14:16.120Z",
  "level": "error",
  "requestId": "req-a8f21c9d",
  "method": "GET",
  "endpoint": "/api/products/999",
  "statusCode": 404,
  "message": "Product not found"
}
```

---

## 🔄 GitHub Actions CI Pipeline

The CI pipeline is defined in `.github/workflows/ci.yml`. On every push or pull request to `main`, `master`, or `feature/**`:
1. Launches an isolated PostgreSQL 16 container (`skillforge_inventory_test_db`).
2. Applies `database/schema.sql` and `database/seed.sql`.
3. Installs backend dependencies (`npm ci`), builds TypeScript (`npm run build`), and runs the complete Vitest test suite (`npm test`).
4. Installs frontend dependencies and verifies client build compilation (`npm run build`).

---

## 🐞 Incident Investigation & Bug Fixes

Investigated incidents and root causes are documented in [docs/INCIDENT_INVESTIGATION.md](file:///docs/INCIDENT_INVESTIGATION.md):
- **Incident A:** Case-insensitive duplicate SKU collisions causing unhandled transaction aborts (Resolved by normalizing and querying with `UPPER(sku)`).
- **Incident B:** Querying non-UUID product IDs (e.g., `999`) causing unhandled Postgres `22P02` syntax error 500 crashes (Resolved with UUID validation and mapping `22P02` to `404 Not Found`).
- **Incident C:** Inverted inventory adjustments (Resolved by enforcing positive numbers on `RESTOCK` and automatic negative deduction on `DAMAGE`/`LOSS`/`SALE`).
- **Incident D:** Duplicate low-stock notification spamming (Resolved with intelligent 24-hour deduplication by notification type and product link).

---

## 🏃 Running the Application

### Backend
```powershell
cd backend
npm run dev
# Server listening on http://localhost:5000
```

### Frontend
```powershell
cd frontend
npm run dev
# Vite dev server running on http://localhost:5173
```
