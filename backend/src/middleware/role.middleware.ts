import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types/index.js';

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions. Current role is ${req.user.role}.`,
      });
      return;
    }

    next();
  };
};

export const requireSuperAdmin = requireRoles(['SUPER_ADMIN']);
export const requireAdminOrSuperAdmin = requireRoles(['SUPER_ADMIN', 'ADMIN']);

