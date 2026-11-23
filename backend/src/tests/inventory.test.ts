import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { resetTestDb } from './helpers/dbSetup.js';
import { getAdminToken, getStaffToken } from './helpers/authHelper.js';

const app = createApp();

describe('Inventory & Stock Management API Tests', () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  // TC-INV-20: Successful stock adjustment (Restock)
  it('TC-INV-20: should successfully restock inventory and record transaction', async () => {
    const adminToken = await getAdminToken();
    const productId = 'a0000000-0000-0000-0000-000000000001'; // Stock starts at 45

    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        transactionType: 'RESTOCK',
        quantityChange: 15,
        reason: 'Shipment received from supplier',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updatedStock).toBe(60);
    expect(res.body.data.transaction.transaction_type).toBe('RESTOCK');
    expect(res.body.data.transaction.quantity_change).toBe(15);
  });

  // TC-INV-21: Invalid stock adjustment (exceeding stock deduction)
  it('TC-INV-21: should reject stock deduction greater than available quantity with 400 Bad Request', async () => {
    const adminToken = await getAdminToken();
    const productId = 'a0000000-0000-0000-0000-000000000002'; // Stock is 8

    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        transactionType: 'DAMAGE',
        quantityChange: -50, // exceeds current stock 8
        reason: 'Water leak damaged warehouse pallet',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/cannot decrease stock/i);
  });

  // TC-INV-22: Inventory transaction record creation
  it('TC-INV-22: should create and retrieve inventory transaction history for a product', async () => {
    const adminToken = await getAdminToken();
    const productId = 'a0000000-0000-0000-0000-000000000004';

    // Perform an adjustment
    await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId,
        transactionType: 'RESTOCK',
        quantityChange: 10,
        reason: 'Replenishment',
      });

    // Fetch transactions
    const res = await request(app)
      .get(`/api/inventory/transactions?productId=${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(2); // INITIAL + RESTOCK
    expect(res.body.data.transactions[0].reason).toBe('Replenishment');
  });

  // TC-INV-23: Low-stock identification
  it('TC-INV-23: should accurately identify low-stock products', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .get('/api/inventory/low-stock')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    // Each product must have stock_quantity <= low_stock_threshold
    res.body.data.forEach((prod: any) => {
      expect(prod.stock_quantity).toBeLessThanOrEqual(prod.low_stock_threshold);
    });
  });

  // TC-INV-24: Out-of-stock identification
  it('TC-INV-24: should accurately identify out-of-stock products', async () => {
    const staffToken = await getStaffToken();

    const res = await request(app)
      .get('/api/products?stockStatus=OUT_OF_STOCK')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    res.body.data.products.forEach((prod: any) => {
      expect(prod.stock_quantity).toBe(0);
      expect(prod.stock_status).toBe('OUT_OF_STOCK');
    });
  });
});
