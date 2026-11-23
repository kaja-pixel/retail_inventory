import { query } from '../config/db.js';

export interface CreateNotificationParams {
  userId?: string | null;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'STOCK_ADJUSTED' | 'SYSTEM_ALERT';
  title: string;
  message: string;
  link?: string;
  deduplicate?: boolean;
}

export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  if (params.deduplicate) {
    const checkSql = `
      SELECT id FROM notifications
      WHERE type = $1 
        AND (title = $2 OR (link IS NOT NULL AND link = $3))
        AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `;
    const existing = await query(checkSql, [params.type, params.title, params.link || '']);
    if (existing.rows.length > 0) {
      return;
    }
  }

  const sql = `
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES ($1, $2, $3, $4, $5)
  `;
  await query(sql, [
    params.userId || null,
    params.type,
    params.title,
    params.message,
    params.link || null,
  ]);
};

/**
 * Checks product stock level and triggers low-stock or out-of-stock notification if necessary
 */
export const checkAndNotifyStockLevel = async (product: {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
}): Promise<void> => {
  if (product.stock_quantity === 0) {
    await createNotification({
      type: 'OUT_OF_STOCK',
      title: `Out of Stock: ${product.name}`,
      message: `Product SKU ${product.sku} is completely out of stock (0 units). Restock immediately.`,
      link: `/products/${product.id}`,
      deduplicate: true,
    });
  } else if (product.stock_quantity <= product.low_stock_threshold) {
    await createNotification({
      type: 'LOW_STOCK',
      title: `Low Stock Alert: ${product.name}`,
      message: `Product SKU ${product.sku} has reached low stock level: ${product.stock_quantity} units remaining (Threshold: ${product.low_stock_threshold}).`,
      link: `/products/${product.id}`,
      deduplicate: true,
    });
  }
};
