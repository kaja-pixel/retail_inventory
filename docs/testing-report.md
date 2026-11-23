# Test Report

This report records checks run in the current checkout. It does not claim that every scenario in the original specification has been tested.

## Automated checks

| Check | Result | Command / evidence |
|---|---|---|
| Backend TypeScript build | Passed | `cd backend; npm run build` |
| Frontend TypeScript and production build | Passed | `cd frontend; npm run build` |
| Frontend Oxlint | Completed with warnings | `cd frontend; npm run lint`; existing unused-import and React-rule warnings remain |
| Backend validator tests | Passed (9 tests) | `cd backend; npm test` |
| Frontend component/e2e suite | Not yet present | No frontend test runner or test files existed when inspected |
| Postman API collection | Added; not executed as a full collection | Import `postman/SkillForge-Inventory.postman_collection.json`; configured Admin/Super Admin credentials and a development database are required |

## Runtime checks

| Check | Result | Evidence |
|---|---|---|
| Local PostgreSQL connection | Passed | `GET http://localhost:5000/api/health` returned `UP` and `CONNECTED` during this verification |
| API health endpoint | Passed | Local API health request returned `UP` and `CONNECTED` during this verification |
| Browser login and dashboard | Passed | Signed in through the local frontend and loaded dashboard analytics |
| Browser products, profile, and user management pages | Passed | Pages rendered with the local authenticated session; the user API snake_case response is now mapped to the frontend user model |
| UI screenshots | Captured | `docs/screenshots/login.png` and `docs/screenshots/register.png`; screenshots omit authenticated personal data |
| Valid seeded-user login and `/auth/me` | Passed | API returned the seeded STAFF identity |
| Staff access to user administration | Passed | `GET /api/users` returned 403 |
| Logout revocation | Passed | Reusing the logged-out token for `/auth/me` returned 401 |
| Invalid password and invalid Google token | Passed | API returned 401 for both |
| Privileged role submitted during registration | Passed | API returned 400; registration rejected the extra role field |
| Stock update bypass | Passed | Product PUT with `stockQuantity` returned 400 |
| Product list, dashboard, low-stock, and notifications reads | Passed | Admin API requests returned product rows, summary metrics, and alert lists |
| Database schema changes | Not applied by this report | Schema file is non-destructive; the existing database was not reset or reseeded |
| Google sign-in | Requires operator configuration | No external Google OAuth flow was claimed as tested |
| SMTP password reset email | Requires SMTP configuration | Development reset link output has not been exercised |

## Remaining verification

Before production, test registration and duplicate-email handling, product creation and stock adjustments, notification ownership, reset-token expiry/reuse, and audit coverage against a disposable PostgreSQL database. Run the Postman create/adjust/delete workflow against a development database to verify persistence and transaction records. Configure real Google OAuth and SMTP credentials and run their end-to-end flows. Do not use the seeded demo accounts in production.
