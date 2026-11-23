# API Reference

Base URL: `http://localhost:5000/api`. Protected routes require `Authorization: Bearer <JWT>`. Request bodies are JSON.

## Authentication

| Method | Path | Access |
|---|---|---|
| POST | `/auth/register` | Public; creates a STAFF account, then the user must sign in |
| POST | `/auth/login` | Public |
| POST | `/auth/google` | Public; verified Google ID token required |
| POST | `/auth/logout` | Authenticated |
| GET | `/auth/me` | Authenticated |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/reset-password` | Public; valid reset token required |
| PUT | `/auth/profile` | Authenticated; updates permitted profile fields |
| PUT | `/auth/change-password` | Authenticated |

## Products and inventory

| Method | Path | Access |
|---|---|---|
| GET | `/products` | Authenticated; `page`, `limit`, `search`, `categoryId`, `stockStatus`, `sortBy`, `sortOrder` filters |
| GET | `/products/categories` | Authenticated |
| GET | `/products/:id` | Authenticated |
| POST | `/products` | ADMIN or SUPER_ADMIN |
| PUT | `/products/:id` | ADMIN or SUPER_ADMIN; stock quantity is changed through adjustments |
| DELETE | `/products/:id` | SUPER_ADMIN |
| GET | `/inventory/low-stock` | Authenticated |
| GET | `/inventory/transactions` | Authenticated; optional `page`, `limit`, `productId`, `transactionType` |
| POST | `/inventory/adjustments` | ADMIN or SUPER_ADMIN |

Stock adjustment body:

```json
{
  "productId": "product-uuid",
  "transactionType": "RESTOCK",
  "quantityChange": 12,
  "reason": "Supplier delivery"
}
```

`quantityChange` must be a non-zero integer. The adjustment is rejected if the resulting stock would be negative.

## Dashboard and notifications

| Method | Path | Access |
|---|---|---|
| GET | `/dashboard/summary` | Authenticated |
| GET | `/dashboard/recent-activities` | Authenticated |
| GET | `/notifications` | Authenticated; optional `unreadOnly`, `limit` |
| GET | `/notifications/unread-count` | Authenticated |
| PATCH | `/notifications/:id/read` | Authenticated; own or system-wide notification |
| PATCH | `/notifications/read-all` | Authenticated |

## Users, audit, and health

| Method | Path | Access |
|---|---|---|
| GET | `/users` | ADMIN or SUPER_ADMIN; optional `search`, `roleId`, `status` |
| GET | `/users/roles` | ADMIN or SUPER_ADMIN |
| GET | `/users/:id` | ADMIN or SUPER_ADMIN |
| PATCH | `/users/:id/role` | SUPER_ADMIN; cannot modify own role |
| PATCH | `/users/:id/status` | SUPER_ADMIN; cannot deactivate own account |
| GET | `/audit-logs` | ADMIN or SUPER_ADMIN |
| GET | `/health` | Public; includes database connectivity status |

All protected operations enforce authorization on the backend. Validation failures return 400, unauthenticated requests return 401, and insufficient role permissions return 403.
