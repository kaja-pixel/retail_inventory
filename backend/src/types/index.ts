import { Request } from 'express';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roleId: number;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  requestId?: string;
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthUser;
    }
  }
}
