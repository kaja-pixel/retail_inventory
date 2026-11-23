import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetTestDb } from './helpers/dbSetup.js';
import { getAdminToken, getStaffToken } from './helpers/authHelper.js';

const app = createApp();

describe('Authorization & RBAC API Tests', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  // TC-AUTH-09: Unauthenticated access to protected APIs
  it('TC-AUTH-09: should reject unauthenticated access to protected APIs with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/authentication.*required/i);
  });

  // TC-AUTH-10: Staff attempting to access Admin-only endpoints
  it('TC-AUTH-10: should forbid STAFF role from accessing Admin-only product creation', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        name: 'Unauthorized Product Creation',
        sku: 'UNAUTH-001',
        categoryId: 1,
        unitPrice: 19.99,
        stockQuantity: 10,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/forbidden/i);
  });

  // TC-AUTH-11: Admin attempting to assign themselves Super Admin privileges
  it('TC-AUTH-11: should forbid ADMIN from escalating their own role or modifying user roles', async () => {
    const adminToken = await getAdminToken();

    // 1. Try modifying their own role via PATCH /api/users/:id/role
    // Admin user id is 22222222-2222-2222-2222-222222222222 in seed
    const res = await request(app)
      .patch('/api/users/22222222-2222-2222-2222-222222222222/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roleId: 1, // SUPER_ADMIN
      });

    // Only SUPER_ADMIN can access role updates
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should forbid STAFF from accessing user management endpoints', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
