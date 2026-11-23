import { Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../types/index.js';

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '20', 10)));
    const offset = (page - 1) * limit;

    const action = req.query.action as string;
    const entityType = req.query.entityType as string;
    const search = (req.query.search as string || '').trim();

    const conditions: string[] = [];
    const params: any[] = [];

    if (action) {
      params.push(action);
      conditions.push(`a.action = $${params.length}`);
    }

    if (entityType) {
      params.push(entityType);
      conditions.push(`a.entity_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(a.actor_email ILIKE $${params.length} OR a.action ILIKE $${params.length} OR a.entity_id ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM audit_logs a ${whereClause}`;
    const countRes = await query(countSql, params);
    const totalItems = parseInt(countRes.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    const dataSql = `
      SELECT 
        a.id,
        a.actor_user_id,
        a.actor_email,
        u.full_name as actor_name,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details,
        a.ip_address,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.actor_user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await query(dataSql, [...params, limit, offset]);

    res.status(200).json({
      success: true,
      data: {
        logs: dataRes.rows,
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

