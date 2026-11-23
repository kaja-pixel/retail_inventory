# Project Report

## Completed in this checkout

- Implemented the React/TypeScript frontend and Express/PostgreSQL API for authentication, product management, inventory adjustments, dashboard summaries, notifications, user administration, and audit history.
- Added role-aware UI routes and backend role enforcement.
- Hardened Google sign-in to require a verified ID token and verified email; removed development identity impersonation.
- Added hashed server-side token-session records so logout and password changes revoke sessions.
- Removed hardcoded credential fallbacks and rotated the local JWT key after confirming it matched the old built-in development key.
- Tightened password requirements and made reset-token consumption atomic.
- Prevented product-edit requests from changing stock outside the inventory-adjustment endpoint.
- Removed destructive table drops from the schema setup script.
- Added Windows-local setup instructions, API documentation, and a factual test report.
- Added a Postman collection for API health, authentication, dashboard, product/inventory CRUD, notifications, users, and audit endpoints.
- Expanded backend validation tests for login, password recovery, profile/password changes, and role/status updates.
- Fixed User Management rendering by mapping the API's snake_case user response into the frontend user model.
- Captured login and registration screenshots without authenticated personal data.

## Challenges and solutions

- The initial Google flow accepted caller-supplied identity data in development. It now requires Google verification against the configured client ID; setup without credentials is documented as an explicit blocker.
- The previous JWT flow could not invalidate a token after logout. Issued token hashes are now registered in the existing session-token table and checked by authentication middleware.
- Setup documentation referred to nonexistent docs and overstated test coverage. The documents now distinguish build/runtime checks from unexecuted integration scenarios.

## Remaining work

- Configure and verify real Google OAuth and SMTP credentials.
- Add comprehensive automated API, database, and browser tests and record their results; the Postman create/adjust/delete workflow has not yet been executed against a development database.
- Capture additional screenshots for inventory and analytics views.
- Create/publish a GitHub repository: this working copy has no configured Git remote.
- Review seed demo credentials and replace/remove them before any production deployment.
