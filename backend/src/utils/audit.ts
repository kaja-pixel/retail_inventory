import { query } from '../config/db.js';

export interface AuditLogParams {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: 'USER' | 'PRODUCT' | 'INVENTORY' | 'AUTH' | 'SYSTEM' | 'ROLE';
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | string[] | null;
}

export const logAudit = async (params: AuditLogParams): Promise<void> => {
  try {
    const text = `
      INSERT INTO audit_logs (actor_user_id, actor_email, action, entity_type, entity_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    const ip = Array.isArray(params.ipAddress) ? params.ipAddress[0] : params.ipAddress;
    const values = [
      params.actorUserId || null,
      params.actorEmail || null,
      params.action,
      params.entityType,
      params.entityId || null,
      params.details ? JSON.stringify(params.details) : null,
      ip || null,
    ];
    await query(text, values);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
