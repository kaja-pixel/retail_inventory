import { Response, NextFunction } from 'express';
import { query, getClient } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { checkAndNotifyStockLevel, createNotification } from '../utils/notifications.js';
import { AuthenticatedRequest } from '../types/index.js';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const getCategories = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await query('SELECT id, name, description FROM categories ORDER BY name ASC');
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10', 10)));
    const offset = (page - 1) * limit;

    const search = (req.query.search as string || '').trim();
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : null;
    const rawStockStatus = (req.query.stockStatus as string || 'ALL').toUpperCase();
    const sortByParam = (req.query.sortBy as string || 'created_at').toLowerCase();
    const sortOrderParam = (req.query.sortOrder as string || 'DESC').toUpperCase();

    // Map allowed sort columns to prevent SQL injection
    const allowedSortFields: Record<string, string> = {
      name: 'p.name',
      sku: 'p.sku',
      price: 'p.unit_price',
      stock: 'p.stock_quantity',
      created_at: 'p.created_at',
      updated_at: 'p.updated_at',
    };
    const sortColumn = allowedSortFields[sortByParam] || 'p.created_at';
    const sortOrder = sortOrderParam === 'ASC' ? 'ASC' : 'DESC';

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (categoryId && !isNaN(categoryId)) {
      params.push(categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (rawStockStatus === 'OUT_OF_STOCK' || rawStockStatus === 'OUT') {
      conditions.push(`p.stock_quantity = 0`);
    } else if (rawStockStatus === 'LOW_STOCK' || rawStockStatus === 'LOW') {
      conditions.push(`p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_threshold`);
    } else if (rawStockStatus === 'IN_STOCK' || rawStockStatus === 'IN') {
      conditions.push(`p.stock_quantity > p.low_stock_threshold`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) FROM products p ${whereClause}`;
    const countResult = await query(countSql, params);
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    // Data query
    const dataSql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category_id,
        c.name as category_name,
        p.description,
        p.unit_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.created_at,
        p.updated_at,
        u_create.full_name as created_by_name,
        u_update.full_name as updated_by_name,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock_quantity <= p.low_stock_threshold THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u_create ON p.created_by = u_create.id
      LEFT JOIN users u_update ON p.updated_by = u_update.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataParams = [...params, limit, offset];
    const dataResult = await query(dataSql, dataParams);

    res.status(200).json({
      success: true,
      data: {
        products: dataResult.rows,
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

export const getProductById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    const sql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.category_id,
        c.name as category_name,
        p.description,
        p.unit_price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.created_at,
        p.updated_at,
        u_create.full_name as created_by_name,
        u_create.email as created_by_email,
        u_update.full_name as updated_by_name,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock_quantity <= p.low_stock_threshold THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u_create ON p.created_by = u_create.id
      LEFT JOIN users u_update ON p.updated_by = u_update.id
      WHERE p.id = $1
    `;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Fetch recent inventory transactions for this product
    const txSql = `
      SELECT 
        t.id,
        t.transaction_type,
        t.quantity_change,
        t.previous_quantity,
        t.new_quantity,
        t.reason,
        t.notes,
        t.created_at,
        u.full_name as user_name
      FROM inventory_transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.product_id = $1
      ORDER BY t.created_at DESC
      LIMIT 10
    `;
    const txResult = await query(txSql, [id]);

    res.status(200).json({
      success: true,
      data: {
        ...result.rows[0],
        transactions: txResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await getClient();
  try {
    const { name, sku, categoryId, description, unitPrice, stockQuantity, lowStockThreshold } = req.body;
    const userId = req.user?.id;
    const normalizedSku = sku.trim().toUpperCase();

    // Check SKU uniqueness (case-insensitive check)
    const skuCheck = await client.query('SELECT id FROM products WHERE UPPER(sku) = $1', [normalizedSku]);
    if (skuCheck.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: `Product with SKU "${sku}" already exists.`,
      });
      return;
    }

    // Check Category exists
    const catCheck = await client.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (catCheck.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Specified category does not exist.',
      });
      return;
    }

    await client.query('BEGIN');

    const insertSql = `
      INSERT INTO products (name, sku, category_id, description, unit_price, stock_quantity, low_stock_threshold, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *
    `;
    const insertRes = await client.query(insertSql, [
      name.trim(),
      normalizedSku,
      categoryId,
      description || null,
      unitPrice,
      stockQuantity ?? 0,
      lowStockThreshold ?? 10,
      userId,
    ]);
    const newProduct = insertRes.rows[0];

    // Record initial inventory transaction if stock > 0
    if (newProduct.stock_quantity > 0) {
      const txSql = `
        INSERT INTO inventory_transactions (product_id, user_id, transaction_type, quantity_change, previous_quantity, new_quantity, reason, notes)
        VALUES ($1, $2, 'INITIAL', $3, 0, $3, 'Initial Product Stock', 'Initial quantity assigned during product creation')
      `;
      await client.query(txSql, [newProduct.id, userId, newProduct.stock_quantity]);
    }

    await client.query('COMMIT');

    // Notifications & Audits (outside transaction)
    await logAudit({
      actorUserId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: newProduct.id,
      details: { name: newProduct.name, sku: newProduct.sku, stock: newProduct.stock_quantity, price: newProduct.unit_price },
      ipAddress: req.ip,
    });

    await createNotification({
      type: 'PRODUCT_CREATED',
      title: 'New Product Added',
      message: `Product "${newProduct.name}" (SKU: ${newProduct.sku}) was added by ${req.user?.fullName}.`,
      link: `/products/${newProduct.id}`,
    });

    await checkAndNotifyStockLevel(newProduct);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const { name, sku, categoryId, description, unitPrice, lowStockThreshold } = req.body;

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // Check if product exists
    const existing = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    const oldProduct = existing.rows[0];

    // Check Category if changing
    if (categoryId !== undefined) {
      const catCheck = await query('SELECT id FROM categories WHERE id = $1', [categoryId]);
      if (catCheck.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Specified category does not exist.' });
        return;
      }
    }

    // Check SKU if changing (case-insensitive)
    if (sku && sku.trim().toUpperCase() !== oldProduct.sku) {
      const normalizedSku = sku.trim().toUpperCase();
      const skuCheck = await query('SELECT id FROM products WHERE UPPER(sku) = $1 AND id != $2', [normalizedSku, id]);
      if (skuCheck.rows.length > 0) {
        res.status(409).json({ success: false, message: `SKU "${sku}" is already assigned to another product.` });
        return;
      }
    }

    const updatedName = name !== undefined ? name.trim() : oldProduct.name;
    const updatedSku = sku !== undefined ? sku.trim().toUpperCase() : oldProduct.sku;
    const updatedCatId = categoryId !== undefined ? categoryId : oldProduct.category_id;
    const updatedDesc = description !== undefined ? description : oldProduct.description;
    const updatedPrice = unitPrice !== undefined ? unitPrice : oldProduct.unit_price;
    const updatedThreshold = lowStockThreshold !== undefined ? lowStockThreshold : oldProduct.low_stock_threshold;

    const updateSql = `
      UPDATE products
      SET name = $1, sku = $2, category_id = $3, description = $4, unit_price = $5, low_stock_threshold = $6, updated_by = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;
    const result = await query(updateSql, [
      updatedName,
      updatedSku,
      updatedCatId,
      updatedDesc,
      updatedPrice,
      updatedThreshold,
      userId,
      id,
    ]);
    const updated = result.rows[0];

    await logAudit({
      actorUserId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: id,
      details: {
        previous: { name: oldProduct.name, sku: oldProduct.sku, price: oldProduct.unit_price, stock: oldProduct.stock_quantity },
        current: { name: updated.name, sku: updated.sku, price: updated.unit_price, stock: updated.stock_quantity },
      },
      ipAddress: req.ip,
    });

    await checkAndNotifyStockLevel(updated);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Validate UUID format
    if (!UUID_REGEX.test(id)) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const existing = await query('SELECT name, sku FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    const product = existing.rows[0];

    await query('DELETE FROM products WHERE id = $1', [id]);

    await logAudit({
      actorUserId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'PRODUCT_DELETED',
      entityType: 'PRODUCT',
      entityId: id,
      details: { name: product.name, sku: product.sku },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};
