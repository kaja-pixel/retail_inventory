import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetTestDb } from './helpers/dbSetup.js';
import { getAdminToken, getSuperAdminToken, getStaffToken } from './helpers/authHelper.js';

const app = createApp();

describe('Product Management API Tests', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  // TC-PROD-12: Successful product creation
  it('TC-PROD-12: should successfully create a product with valid input by Admin', async () => {
    const adminToken = await getAdminToken();

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Mechanical Gaming Keyboard',
        sku: 'TECH-KEY-001',
        categoryId: 1,
        description: 'RGB mechanical switch keyboard',
        unitPrice: 89.99,
        stockQuantity: 25,
        lowStockThreshold: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.sku).toBe('TECH-KEY-001');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  // TC-PROD-13: Duplicate SKU validation (case-insensitive)
  it('TC-PROD-13: should reject product creation with duplicate SKU (case-insensitive) with 409 Conflict', async () => {
    const adminToken = await getAdminToken();

    // In seed.sql, 'ELEC-WNC-001' exists
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Headphone',
        sku: 'elec-wnc-001', // lowercase variant
        categoryId: 1,
        unitPrice: 120.00,
        stockQuantity: 10,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // TC-PROD-14: Negative product price validation
  it('TC-PROD-14: should reject negative product price with 400 Bad Request', async () => {
    const adminToken = await getAdminToken();

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Negative Price Item',
        sku: 'NEG-PRICE-001',
        categoryId: 1,
        unitPrice: -29.99,
        stockQuantity: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/unit price cannot be negative/i);
  });

  // TC-PROD-15: Negative stock quantity validation
  it('TC-PROD-15: should reject negative stock quantity with 400 Bad Request', async () => {
    const adminToken = await getAdminToken();

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Negative Stock Item',
        sku: 'NEG-STOCK-001',
        categoryId: 1,
        unitPrice: 19.99,
        stockQuantity: -5,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/stock quantity cannot be negative/i);
  });

  // TC-PROD-16: Retrieve existing product details
  it('TC-PROD-16: should retrieve existing product details with 200 OK', async () => {
    const staffToken = await getStaffToken();
    const productId = 'a0000000-0000-0000-0000-000000000001';

    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(productId);
    expect(res.body.data.name).toBe('Wireless Noise-Canceling Headphones');
    expect(res.body.data.transactions).toBeDefined();
  });

  // TC-PROD-17: Update product information
  it('TC-PROD-17: should successfully update product details with 200 OK', async () => {
    const adminToken = await getAdminToken();
    const productId = 'a0000000-0000-0000-0000-000000000001';

    const res = await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Wireless Noise-Canceling Headphones Deluxe',
        unitPrice: 179.99,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Wireless Noise-Canceling Headphones Deluxe');
    expect(Number(res.body.data.unit_price)).toBe(179.99);
  });

  // TC-PROD-18: Delete product with appropriate permissions (Super Admin)
  it('TC-PROD-18: should allow Super Admin to delete product, but reject Staff', async () => {
    const staffToken = await getStaffToken();
    const superAdminToken = await getSuperAdminToken();
    const productId = 'a0000000-0000-0000-0000-000000000012';

    // 1. Staff delete attempt -> 403 Forbidden
    const staffRes = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffRes.status).toBe(403);

    // 2. Super Admin delete attempt -> 200 OK
    const superRes = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(superRes.status).toBe(200);
    expect(superRes.body.success).toBe(true);

    // 3. Verify product is gone
    const getRes = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(getRes.status).toBe(404);
  });

  // TC-PROD-19: Retrieve a non-existing product or invalid ID
  it('TC-PROD-19: should return 404 Not Found for non-existing product ID or integer ID without 500 error', async () => {
    const staffToken = await getStaffToken();

    // 1. Non-existent valid UUID
    const resUuid = await request(app)
      .get('/api/products/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resUuid.status).toBe(404);
    expect(resUuid.body.message).toMatch(/product not found/i);

    // 2. Non-UUID integer ID (e.g. 999)
    const resNumeric = await request(app)
      .get('/api/products/999')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resNumeric.status).toBe(404);
    expect(resNumeric.body.message).toMatch(/product not found/i);
    expect(resNumeric.headers['x-request-id']).toBeDefined();
  });

  // TC-ADD-25: Product pagination
  it('TC-ADD-25: should paginate products correctly with limit and offset', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .get('/api/products?page=1&limit=5')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(5);
    expect(res.body.data.pagination.currentPage).toBe(1);
    expect(res.body.data.pagination.limit).toBe(5);
    expect(res.body.data.pagination.totalItems).toBeGreaterThanOrEqual(12);
  });

  // TC-ADD-26: Product search and filtering
  it('TC-ADD-26: should filter products by search keyword and category', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .get('/api/products?search=Coffee&categoryId=2')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBe(1);
    expect(res.body.data.products[0].name).toMatch(/coffee/i);
  });

  // TC-ADD-27: Product sorting
  it('TC-ADD-27: should sort products by price ascending', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .get('/api/products?sortBy=price&sortOrder=ASC&limit=20')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const products = res.body.data.products;
    expect(products.length).toBeGreaterThan(1);

    for (let i = 0; i < products.length - 1; i++) {
      expect(Number(products[i].unit_price)).toBeLessThanOrEqual(Number(products[i + 1].unit_price));
    }
  });
});
