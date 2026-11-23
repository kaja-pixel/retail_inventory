# Automated Test Plan: Retail Inventory & Stock Management

**Project:** Retail Inventory & Stock Management Web Application  
**Version:** 1.0.0  
**Environment:** Testing (PostgreSQL `skillforge_inventory_test_db`)  
**Test Framework:** Vitest & Supertest  
**Author:** QA & Engineering Team  
**Date:** November 2026  

---

## 1. Overview & Strategy

This test plan defines the automated testing scope, architecture, test scenarios, and validation criteria for the Retail Inventory & Stock Management REST API.

The objectives are:
1. Prevent regressions across authentication, authorization (RBAC), product management, inventory adjustments, notifications, and dashboard analytics.
2. Isolate all test executions inside a dedicated testing database (`skillforge_inventory_test_db`), guaranteeing zero contamination of development or production databases.
3. Integrate with continuous integration (GitHub Actions) to validate all pull requests automatically.
4. Verify Request ID tracking and structured logging across standard and error workflows.

---

## 2. Test Scope & Matrix

| Module | Scope | Key Validations |
| :--- | :--- | :--- |
| **Authentication** | Registration, Login, Google Auth, Logout | Password hashing, duplicate email rejection, default STAFF role assignment, invalid token rejection |
| **Authorization (RBAC)** | Protected endpoints, Role hierarchies | Public vs Staff vs Admin vs Super Admin permissions, privilege escalation prevention |
| **Product Management** | CRUD, SKU constraints, pricing/stock bounds | Duplicate SKU rejection, negative price/stock rejection, UUID validation, 404 handling |
| **Inventory Management** | Stock adjustments, transactions, triggers | Atomic stock updates, negative stock prevention, transaction logging, low/out-of-stock trigger |
| **Search & Pagination** | Filtering, sorting, pagination metadata | Keyword ILIKE matching, category filter, stock status filter, SQL injection immunity |
| **Notifications & Audits** | Notifications, Audit trail | Notification creation, deduplication, mark-as-read, audit log persistence |
| **Incident Regression** | Specific edge cases and defect fixes | Case-insensitive SKU collisions, non-UUID param handling, transaction type sign enforcement |

---

## 3. Test Cases Specification (31 Test Cases)

| Test Case ID | Test Scenario | Request Method | Endpoint | Test Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Successful user registration | `POST` | `/api/auth/register` | `{"fullName": "Test Staff", "email": "teststaff@example.com", "password": "Password123", "confirmPassword": "Password123"}` | `201 Created`, user object returned with `role: "STAFF"`, password omitted | `201 Created`, user created with STAFF role | PASS |
| **TC-AUTH-02** | Duplicate email registration rejection | `POST` | `/api/auth/register` | Existing email `"teststaff@example.com"` | `409 Conflict`, error message indicating email already exists | `409 Conflict`, error returned | PASS |
| **TC-AUTH-03** | Invalid email format & weak password validation | `POST` | `/api/auth/register` | `{"fullName": "A", "email": "invalid-email", "password": "weak"}` | `400 Bad Request`, validation errors for name length, email format, and password complexity | `400 Bad Request`, Zod validation errors | PASS |
| **TC-AUTH-04** | Successful login with valid credentials | `POST` | `/api/auth/login` | `{"email": "admin@skillforge.com", "password": "Password123"}` | `200 OK`, JWT auth token and user profile returned | `200 OK`, valid JWT token returned | PASS |
| **TC-AUTH-05** | Invalid login credentials rejection | `POST` | `/api/auth/login` | `{"email": "admin@skillforge.com", "password": "WrongPassword999"}` | `401 Unauthorized`, error message "Invalid email or password credentials." | `401 Unauthorized`, credentials rejected | PASS |
| **TC-AUTH-06** | Logout functionality | `POST` | `/api/auth/logout` | `Authorization: Bearer <valid_jwt>` | `200 OK`, token revoked message, token blacklist recorded | `200 OK`, logged out successfully | PASS |
| **TC-AUTH-07** | Verify default STAFF role assignment on registration | `POST` | `/api/auth/register` | `{"fullName": "New Member", "email": "newmember@example.com", "password": "Password123", "confirmPassword": "Password123"}` | `201 Created`, `data.user.role === "STAFF"` and `roleId === 3` | `201 Created`, role is STAFF | PASS |
| **TC-AUTH-08** | Reject invalid Google authentication token | `POST` | `/api/auth/google` | `{"idToken": "invalid_fake_google_token_xyz"}` | `401 Unauthorized`, message "Google identity verification failed." | `401 Unauthorized`, verification failed | PASS |
| **TC-AUTH-09** | Block unauthenticated access to protected APIs | `GET` | `/api/products` | No `Authorization` header | `401 Unauthorized`, message "Authentication required" | `401 Unauthorized`, access denied | PASS |
| **TC-AUTH-10** | Staff attempting to access Admin-only endpoints | `POST` | `/api/products` | Bearer token of STAFF user, valid product payload | `403 Forbidden`, message requiring `ADMIN` or `SUPER_ADMIN` role | `403 Forbidden`, staff access blocked | PASS |
| **TC-AUTH-11** | Admin attempting to assign themselves Super Admin privileges | `PATCH` | `/api/users/:adminId/role` | Bearer token of ADMIN user, `{"roleId": 1}` | `403 Forbidden`, message forbidding role self-modification and requiring SUPER_ADMIN | `403 Forbidden`, escalation blocked | PASS |
| **TC-PROD-12** | Successful product creation by Admin | `POST` | `/api/products` | Bearer token of ADMIN, `{"name": "Wireless Mouse", "sku": "WM-9001", "categoryId": 1, "unitPrice": 29.99, "stockQuantity": 50, "lowStockThreshold": 10}` | `201 Created`, product record returned, initial transaction recorded | `201 Created`, product created | PASS |
| **TC-PROD-13** | Duplicate SKU validation (case-insensitive) | `POST` | `/api/products` | Same SKU `"wm-9001"` (different case) | `409 Conflict`, error indicating product SKU already exists | `409 Conflict`, duplicate SKU rejected | PASS |
| **TC-PROD-14** | Negative product price validation | `POST` | `/api/products` | `{"name": "Bad Price", "sku": "BP-001", "categoryId": 1, "unitPrice": -15.00}` | `400 Bad Request`, validation error "Unit price cannot be negative" | `400 Bad Request`, validation caught | PASS |
| **TC-PROD-15** | Negative stock quantity validation | `POST` | `/api/products` | `{"name": "Bad Stock", "sku": "BS-001", "categoryId": 1, "unitPrice": 10.00, "stockQuantity": -5}` | `400 Bad Request`, validation error "Stock quantity cannot be negative" | `400 Bad Request`, validation caught | PASS |
| **TC-PROD-16** | Retrieve existing product details | `GET` | `/api/products/:productId` | Valid product ID, authenticated request | `200 OK`, product details with category name, creator name, and transactions | `200 OK`, product details returned | PASS |
| **TC-PROD-17** | Update product information | `PUT` | `/api/products/:productId` | Bearer token of ADMIN, `{"name": "Wireless Mouse Pro", "unitPrice": 34.99}` | `200 OK`, updated product record returned with new unit price | `200 OK`, product updated | PASS |
| **TC-PROD-18** | Delete product with Super Admin permission | `DELETE` | `/api/products/:productId` | Bearer token of SUPER_ADMIN | `200 OK`, product deleted message | `200 OK`, product removed | PASS |
| **TC-PROD-19** | Retrieve non-existing product or invalid ID | `GET` | `/api/products/999` or `/api/products/00000000-0000-0000-0000-000000000000` | Non-existent UUID or non-UUID integer ID | `404 Not Found`, message "Product not found" (no 500 DB syntax crash) | `404 Not Found`, clean response | PASS |
| **TC-INV-20** | Successful stock adjustment (Restock) | `POST` | `/api/inventory/adjustments` | `{"productId": "<id>", "transactionType": "RESTOCK", "quantityChange": 20, "reason": "Monthly replenishment"}` | `200 OK`, updated stock quantity increases by 20, transaction recorded | `200 OK`, stock updated | PASS |
| **TC-INV-21** | Reject invalid stock adjustment (exceeding stock deduction) | `POST` | `/api/inventory/adjustments` | `{"productId": "<id>", "transactionType": "DAMAGE", "quantityChange": -9999, "reason": "Massive damage"}` | `400 Bad Request`, message indicating stock cannot be decreased below 0 | `400 Bad Request`, deduction rejected | PASS |
| **TC-INV-22** | Inventory transaction record creation | `GET` | `/api/inventory/transactions?productId=<id>` | Valid product ID | `200 OK`, list containing initial, restock, and damage records with user audit | `200 OK`, audit records returned | PASS |
| **TC-INV-23** | Low-stock product identification | `GET` | `/api/inventory/low-stock` | Authenticated request | `200 OK`, list of all products where `stock_quantity <= low_stock_threshold` and `> 0` marked `LOW_STOCK` | `200 OK`, low stock items returned | PASS |
| **TC-INV-24** | Out-of-stock product identification | `GET` | `/api/products?stockStatus=OUT_OF_STOCK` | Authenticated request | `200 OK`, all returned products have `stock_quantity === 0` and status `OUT_OF_STOCK` | `200 OK`, filtered accurately | PASS |
| **TC-ADD-25** | Product pagination metadata and limits | `GET` | `/api/products?page=1&limit=5` | Authenticated request | `200 OK`, array length <= 5, `pagination: { currentPage: 1, limit: 5, totalItems, totalPages }` | `200 OK`, correct pagination shape | PASS |
| **TC-ADD-26** | Product search and filtering by category | `GET` | `/api/products?search=Mouse&categoryId=1` | Authenticated request | `200 OK`, only products matching search term and category ID 1 returned | `200 OK`, filtered correctly | PASS |
| **TC-ADD-27** | Product sorting (price ascending / descending) | `GET` | `/api/products?sortBy=price&sortOrder=ASC` | Authenticated request | `200 OK`, returned products ordered monotonically non-decreasing by unit price | `200 OK`, sorted properly | PASS |
| **TC-ADD-28** | Mark notification as read | `PATCH` | `/api/notifications/:id/read` | Valid notification ID | `200 OK`, notification marked `is_read = true` | `200 OK`, marked as read | PASS |
| **TC-ADD-29** | Dashboard statistics structure & valuation | `GET` | `/api/dashboard/summary` | Authenticated request | `200 OK`, returns `totalProducts`, `totalStockUnits`, `totalValuation` (numeric), `lowStockCount`, `categories` | `200 OK`, expected shape returned | PASS |
| **TC-ADD-30** | Audit log record creation upon sensitive action | `GET` | `/api/audit` | Bearer token of SUPER_ADMIN | `200 OK`, audit records present for `PRODUCT_CREATED`, `STOCK_ADJUSTED`, `USER_LOGIN` | `200 OK`, audit logs verified | PASS |
| **TC-ADD-31** | Database error handling & Request ID header | `GET` | `/api/products/invalid-uuid-syntax` | Authenticated request | `404 Not Found` or `400 Bad Request`, `X-Request-ID` header present in response | `404 Not Found`, `X-Request-ID` included | PASS |

---

## 4. Test Execution & Reporting

- **Execution Command:** `npm test` inside `backend/`
- **Database Used:** `skillforge_inventory_test_db`
- **Output:** Vitest / Supertest test report detailing suites, assertions, elapsed time, and exit code.
