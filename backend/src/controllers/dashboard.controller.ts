import { Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../types/index.js';

export const getDashboardSummary = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Overall Product and Stock Metrics
    const metricsSql = `
      SELECT 
        COUNT(*)::int as total_products,
        COALESCE(SUM(stock_quantity), 0)::int as total_stock_units,
        COALESCE(SUM(unit_price * stock_quantity), 0)::numeric(12,2) as total_valuation,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END)::int as out_of_stock_count,
        COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity <= low_stock_threshold THEN 1 END)::int as low_stock_count,
        COUNT(CASE WHEN stock_quantity > low_stock_threshold THEN 1 END)::int as in_stock_count
      FROM products
    `;
    const metricsRes = await query(metricsSql);
    const metrics = metricsRes.rows[0];

    // 2. Total Categories
    const catCountRes = await query('SELECT COUNT(*)::int as count FROM categories');
    const totalCategories = catCountRes.rows[0].count;

    // 3. Category Breakdown
    const catBreakdownSql = `
      SELECT 
        c.id,
        c.name,
        COUNT(p.id)::int as product_count,
        COALESCE(SUM(p.stock_quantity), 0)::int as total_units,
        COALESCE(SUM(p.unit_price * p.stock_quantity), 0)::numeric(12,2) as valuation
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY total_units DESC
    `;
    const catBreakdownRes = await query(catBreakdownSql);

    res.status(200).json({
      success: true,
      data: {
        totalProducts: metrics.total_products,
        totalCategories,
        totalStockUnits: metrics.total_stock_units,
        totalValuation: parseFloat(metrics.total_valuation),
        lowStockCount: metrics.low_stock_count,
        outOfStockCount: metrics.out_of_stock_count,
        inStockCount: metrics.in_stock_count,
        categories: catBreakdownRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentActivities = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Recently updated or added products
    const recentProductsSql = `
      SELECT 
        p.id, p.name, p.sku, p.stock_quantity, p.unit_price, p.updated_at,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.updated_at DESC
      LIMIT 5
    `;
    const recentProducts = await query(recentProductsSql);

    // 2. Recent Inventory Transactions
    const recentTxSql = `
      SELECT 
        t.id, t.transaction_type, t.quantity_change, t.previous_quantity, t.new_quantity,
        t.reason, t.created_at,
        p.name as product_name, p.sku as product_sku,
        u.full_name as user_name
      FROM inventory_transactions t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 5
    `;
    const recentTx = await query(recentTxSql);

    // 3. Recent Audit Activity
    const recentAuditSql = `
      SELECT id, actor_email, action, entity_type, entity_id, details, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 5
    `;
    const recentAudit = await query(recentAuditSql);

    res.status(200).json({
      success: true,
      data: {
        recentProducts: recentProducts.rows,
        recentTransactions: recentTx.rows,
        recentAudits: recentAudit.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

