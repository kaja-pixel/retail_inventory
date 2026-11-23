import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../config/db.js';
import { AuthenticatedRequest, AuthUser, UserRole } from '../types/index.js';
import { isAuthTokenActive } from '../utils/authTokens.js';

interface JwtPayload {
  userId: string;
  email: string;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication token required',
    });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError'
        ? 'Token expired. Please log in again.'
        : 'Invalid authentication token',
    });
    return;
  }

  try {
    if (!(await isAuthTokenActive(decoded.userId, token))) {
      res.status(401).json({
        success: false,
        message: 'Session is no longer active. Please log in again.',
      });
      return;
    }

    // Fetch user and check active status in database
    const sql = `
      SELECT u.id, u.email, u.full_name, u.role_id, u.status, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await query(sql, [decoded.userId]);

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'User account not found',
      });
      return;
    }

    const userRow = result.rows[0];

    if (userRow.status !== 'ACTIVE') {
      res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact your administrator.',
      });
      return;
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      roleId: userRow.role_id,
      role: userRow.role_name as UserRole,
      status: userRow.status,
    };

    next();
  } catch (err) {
    next(err);
  }
};
