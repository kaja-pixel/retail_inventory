import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetTestDb } from './helpers/dbSetup.js';
import { getAdminToken, getSuperAdminToken, getStaffToken } from './helpers/authHelper.js';
import { pool } from '../config/db.js';

const app = createApp();

describe('Additional Features & Incident Regression Tests', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  // TC-ADD-28: Notification read functionality
  it('TC-ADD-28: should mark a notification as read with 200 OK', async () => {
    const adminToken = await getAdminToken();

    // Get an unread notification for admin
    const getRes = await request(app)
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    const notifications = getRes.body.data;
    expect(notifications.length).toBeGreaterThan(0);
    const targetId = notifications[0].id;

    // Mark as read
    const patchRes = await request(app)
      .patch(`/api/notifications/${targetId}/read`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.is_read).toBe(true);
  });

  // TC-ADD-29: Dashboard statistics
  it('TC-ADD-29: should return accurate dashboard summary metrics and categories', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalProducts).toBeGreaterThanOrEqual(12);
    expect(res.body.data.totalStockUnits).toBeGreaterThan(0);
    expect(typeof res.body.data.totalValuation).toBe('number');
    expect(Array.isArray(res.body.data.categories)).toBe(true);
  });

  // TC-ADD-30: Audit log creation
  it('TC-ADD-30: should record audit log entries upon product and stock actions', async () => {
    const superAdminToken = await getSuperAdminToken();
    const adminToken = await getAdminToken();

    // Perform an action: create product
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Audit Tracked Item',
        sku: 'AUDIT-SKU-99',
        categoryId: 1,
        unitPrice: 50.0,
        stockQuantity: 10,
      });

    // Check audit logs as super admin
    const auditRes = await request(app)
      .get('/api/audit?action=PRODUCT_CREATED')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.logs.length).toBeGreaterThan(0);
    expect(auditRes.body.data.logs[0].action).toBe('PRODUCT_CREATED');
  });

  // TC-ADD-31: Request ID Header & Error Handling
  it('TC-ADD-31: should include X-Request-ID header in every response including error responses', async () => {
    // 1. Success response
    const successRes = await request(app).get('/');
    expect(successRes.headers['x-request-id']).toBeDefined();
    expect(successRes.headers['x-request-id']).toMatch(/^req-/);

    // 2. Custom X-Request-ID propagation
    const customId = 'req-custom-client-id-1234';
    const customRes = await request(app)
      .get('/')
      .set('X-Request-ID', customId);
    expect(customRes.headers['x-request-id']).toBe(customId);

    // 3. Error response (404)
    const errorRes = await request(app).get('/api/invalid-endpoint-does-not-exist');
    expect(errorRes.status).toBe(404);
    expect(errorRes.headers['x-request-id']).toBeDefined();
  });

  // INCIDENT REGRESSION 1: Case-insensitive duplicate SKU collision handling
  it('INCIDENT-01: should prevent duplicate SKU even when cases differ (e.g. UPPER vs lowercase)', async () => {
    const adminToken = await getAdminToken();

    // In seed data: 'APP-TSH-001' exists
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another T-Shirt',
        sku: 'app-tsh-001', // different case
        categoryId: 3,
        unitPrice: 25.0,
        stockQuantity: 10,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
    expect(res.headers['x-request-id']).toBeDefined();
  });

  // INCIDENT REGRESSION 2: Inconsistent inventory adjustment signs (e.g. RESTOCK with negative quantity)
  it('INCIDENT-02: should reject RESTOCK with negative quantity change to prevent unintended stock decrement', async () => {
    const adminToken = await getAdminToken();
    const productId = 'a0000000-0000-0000-0000-000000000001';

    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        transactionType: 'RESTOCK',
        quantityChange: -10, // Invalid: RESTOCK must be positive
        reason: 'Erroneous restock request',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/must be a positive number/i);
  });

  // INCIDENT REGRESSION 3: Prevention of repeated low-stock notifications for same product within 24 hours
  it('INCIDENT-03: should not generate duplicate low-stock notifications within 24 hours', async () => {
    const adminToken = await getAdminToken();
    const productId = 'a0000000-0000-0000-0000-000000000002'; // Stock is 8, threshold is 15 (low stock)

    // First adjustment (from 8 to 7) - triggers low-stock alert
    await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        transactionType: 'SALE',
        quantityChange: -1,
        reason: 'Customer sale 1',
      });

    const firstCount = await pool.query(
      "SELECT COUNT(*)::int as count FROM notifications WHERE type = 'LOW_STOCK' AND link = $1",
      [`/products/${productId}`]
    );
    expect(firstCount.rows[0].count).toBe(1);

    // Second adjustment (from 7 to 6) - deduplication suppresses duplicate alert!
    await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        transactionType: 'SALE',
        quantityChange: -1,
        reason: 'Customer sale 2',
      });

    const secondCount = await pool.query(
      "SELECT COUNT(*)::int as count FROM notifications WHERE type = 'LOW_STOCK' AND link = $1",
      [`/products/${productId}`]
    );

    expect(secondCount.rows[0].count).toBe(firstCount.rows[0].count);
  });

  // INCIDENT REGRESSION 4: Malformed/non-UUID resource lookup returns 404 instead of 500 crash
  it('INCIDENT-04: should return 404 cleanly when non-UUID string or integer is passed to /api/products/:id', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .get('/api/products/999')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Product not found');
    expect(res.headers['x-request-id']).toBeDefined();
  });
});
