import { Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import { logAudit } from '../utils/audit.js';
import { AuthenticatedRequest } from '../types/index.js';

export const getRoles = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await query('SELECT id, name, description FROM roles ORDER BY id ASC');
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = (req.query.search as string || '').trim();
    const roleId = req.query.roleId ? parseInt(req.query.roleId as string, 10) : null;
    const status = (req.query.status as string || '').toUpperCase();

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    if (roleId && !isNaN(roleId)) {
      params.push(roleId);
      conditions.push(`u.role_id = $${params.length}`);
    }

    if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role_id,
        r.name as role_name,
        u.status,
        u.google_id IS NOT NULL as is_google_user,
        u.avatar_url,
        u.created_at,
        u.updated_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `;

    const result = await query(sql, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;

    const sql = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role_id,
        r.name as role_name,
        u.status,
        u.google_id IS NOT NULL as is_google_user,
        u.avatar_url,
        u.created_at,
        u.updated_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { roleId } = req.body;
    const currentUserId = req.user?.id;

    // Rule: Users must not assign roles to themselves
    if (id === currentUserId) {
      res.status(403).json({
        success: false,
        message: 'Security policy forbids modifying your own user role.',
      });
      return;
    }

    // Verify role exists
    const roleCheck = await query('SELECT id, name FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      res.status(400).json({ success: false, message: 'Specified role ID does not exist.' });
      return;
    }
    const targetRole = roleCheck.rows[0];

    // Find target user
    const targetUserRes = await query('SELECT id, email, full_name, role_id FROM users WHERE id = $1', [id]);
    if (targetUserRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const targetUser = targetUserRes.rows[0];

    // Update role
    const updateSql = `
      UPDATE users 
      SET role_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, full_name, email, role_id, status
    `;
    const updatedRes = await query(updateSql, [roleId, id]);

    await logAudit({
      actorUserId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'USER_ROLE_CHANGED',
      entityType: 'USER',
      entityId: id,
      details: {
        userEmail: targetUser.email,
        previousRoleId: targetUser.role_id,
        newRoleId: roleId,
        newRoleName: targetRole.name,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `User role updated to ${targetRole.name}`,
      data: {
        ...updatedRes.rows[0],
        role_name: targetRole.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const currentUserId = req.user?.id;

    if (id === currentUserId) {
      res.status(403).json({
        success: false,
        message: 'Security policy forbids deactivating your own account.',
      });
      return;
    }

    const targetUserRes = await query('SELECT id, email, full_name, status FROM users WHERE id = $1', [id]);
    if (targetUserRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const targetUser = targetUserRes.rows[0];

    const updateSql = `
      UPDATE users 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, full_name, email, role_id, status
    `;
    const result = await query(updateSql, [status, id]);

    await logAudit({
      actorUserId: req.user?.id,
      actorEmail: req.user?.email,
      action: 'USER_STATUS_CHANGED',
      entityType: 'USER',
      entityId: id,
      details: {
        userEmail: targetUser.email,
        previousStatus: targetUser.status,
        newStatus: status,
      },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `User status changed to ${status}`,
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};
