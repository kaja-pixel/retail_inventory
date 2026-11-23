import { Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../types/index.js';

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '25', 10)));

    const conditions = ['(user_id = $1 OR user_id IS NULL)'];
    const params: any[] = [userId];

    if (unreadOnly) {
      conditions.push('is_read = false');
    }

    const sql = `
      SELECT id, user_id, type, title, message, link, is_read, created_at
      FROM notifications
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `;

    const result = await query(sql, [...params, limit]);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const sql = `
      SELECT COUNT(*)::int as count 
      FROM notifications 
      WHERE (user_id = $1 OR user_id IS NULL) AND is_read = false
    `;
    const result = await query(sql, [userId]);
    res.status(200).json({
      success: true,
      data: {
        unreadCount: result.rows[0].count,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;

    const sql = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
      RETURNING *
    `;
    const result = await query(sql, [id, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or access denied',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const sql = `
      UPDATE notifications
      SET is_read = true
      WHERE (user_id = $1 OR user_id IS NULL) AND is_read = false
    `;
    await query(sql, [userId]);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};
