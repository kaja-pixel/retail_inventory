import { Response, NextFunction } from 'express';
import { query, getClient } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { checkAndNotifyStockLevel, createNotification } from '../utils/notifications.js';
import { AuthenticatedRequest } from '../types/index.js';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const getLowStockProducts = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category_id,
        c.name as category_name,
        p.unit_price,
        p.stock_quantity,
        p.low_stock_threshold,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END as stock_status
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.stock_quantity <= p.low_stock_threshold
      ORDER BY p.stock_quantity ASC, p.name ASC
    `;
    const result = await query(sql);
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '15', 10)));
    const offset = (page - 1) * limit;

    const productId = req.query.productId as string;
    const transactionType = req.query.transactionType as string;

    const conditions: string[] = [];
    const params: any[] = [];

    if (productId) {
      if (UUID_REGEX.test(productId)) {
        params.push(productId);
        conditions.push(`t.product_id = $${params.length}`);
      } else {
        // Non-matching UUID will yield empty set
        conditions.push('1 = 0');
      }
    }

    if (transactionType) {
      params.push(transactionType.toUpperCase());
      conditions.push(`t.transaction_type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM inventory_transactions t ${whereClause}`;
    const countRes = await query(countSql, params);
    const totalItems = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
      SELECT 
        t.id,
        t.product_id,
        p.name as product_name,
        p.sku as product_sku,
        t.user_id,
        u.full_name as user_name,
        t.transaction_type,
        t.quantity_change,
        t.previous_quantity,
        t.new_quantity,
        t.reason,
        t.notes,
        t.created_at
      FROM inventory_transactions t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, limit, offset];
    const dataRes = await query(dataSql, dataParams);

    res.status(200).json({
      success: true,
      data: {
        transactions: dataRes.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await getClient();
  try {
    const { productId, transactionType, quantityChange, reason, notes } = req.body;
    const userId = req.user?.id;

    // Validate productId UUID
    if (!UUID_REGEX.test(productId)) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // Validate quantityChange direction consistency with transactionType
    let effectiveChange = quantityChange;
    if (['DAMAGE', 'LOSS', 'SALE'].includes(transactionType)) {
      effectiveChange = quantityChange > 0 ? -quantityChange : quantityChange;
    } else if (['RESTOCK', 'RETURN'].includes(transactionType)) {
      if (quantityChange < 0) {
        res.status(400).json({
          success: false,
          message: `Quantity change for ${transactionType} must be a positive number.`,
        });
        return;
      }
      effectiveChange = Math.abs(quantityChange);
    }

    await client.query('BEGIN');

    // 1. Lock product row for atomic update
    const productRes = await client.query(
      'SELECT id, name, sku, stock_quantity, low_stock_threshold FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (productRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const product = productRes.rows[0];
    const previousQuantity = product.stock_quantity;
    const newQuantity = previousQuantity + effectiveChange;

    if (newQuantity < 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: `Cannot decrease stock by ${Math.abs(effectiveChange)}. Current stock is only ${previousQuantity} units.`,
      });
      return;
    }

    // 2. Update product stock
    await client.query(
      'UPDATE products SET stock_quantity = $1, updated_by = $2, updated_at = NOW() WHERE id = $3',
      [newQuantity, userId, productId]
    );

    // 3. Record inventory transaction
    const txSql = `
      INSERT INTO inventory_transactions 
      (product_id, user_id, transaction_type, quantity_change, previous_quantity, new_quantity, reason, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const txRes = await client.query(txSql, [
      productId,
      userId,
      transactionType,
      effectiveChange,
      previousQuantity,
      newQuantity,
      reason,
      notes || null,
    ]);
    const txRecord = txRes.rows[0];

    await client.query('COMMIT');

    // 4. Log Audit
    await logAudit({
      actorUserId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'STOCK_ADJUSTED',
      entityType: 'INVENTORY',
      entityId: productId,
      details: {
        productName: product.name,
        sku: product.sku,
        type: transactionType,
        change: effectiveChange,
        previousQuantity,
        newQuantity,
        reason,
      },
      ipAddress: req.ip,
    });

    // 5. Notify Stock Adjusted
    await createNotification({
      type: 'STOCK_ADJUSTED',
      title: `Stock Adjusted: ${product.name}`,
      message: `${req.user?.fullName} adjusted stock (${effectiveChange > 0 ? '+' : ''}${effectiveChange}) to ${newQuantity} units. Reason: ${reason}.`,
      link: `/products/${productId}`,
    });

    // 6. Check low/out-of stock trigger
    await checkAndNotifyStockLevel({
      id: productId,
      name: product.name,
      sku: product.sku,
      stock_quantity: newQuantity,
      low_stock_threshold: product.low_stock_threshold,
    });

    res.status(200).json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        transaction: txRecord,
        updatedStock: newQuantity,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
