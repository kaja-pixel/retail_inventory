import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { getClient, query } from '../config/db.js';
import { config } from '../config/env.js';
import { logAudit } from '../utils/audit.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { issueAuthToken, revokeAuthToken, revokeUserTokens } from '../utils/authTokens.js';
import { AuthenticatedRequest, UserRole } from '../types/index.js';

const googleClient = new OAuth2Client(config.google.clientId);

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fullName, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check for duplicate email
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
      return;
    }

    // 2. Fetch default STAFF role (id = 3)
    const roleRes = await query('SELECT id, name FROM roles WHERE name = $1', ['STAFF']);
    const defaultRoleId = roleRes.rows[0]?.id;
    if (!defaultRoleId) {
      throw new Error('The default STAFF role is missing from the database.');
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert user
    const insertSql = `
      INSERT INTO users (full_name, email, password_hash, role_id, status)
      VALUES ($1, $2, $3, $4, 'ACTIVE')
      RETURNING id, full_name, email, role_id, status, created_at
    `;
    const userRes = await query(insertSql, [fullName.trim(), normalizedEmail, passwordHash, defaultRoleId]);
    const newUser = userRes.rows[0];

    // 5. Log audit
    await logAudit({
      actorUserId: newUser.id,
      actorEmail: newUser.email,
      action: 'USER_REGISTER',
      entityType: 'USER',
      entityId: newUser.id,
      details: { email: newUser.email, role: 'STAFF' },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully. Please sign in.',
      data: {
        user: {
          id: newUser.id,
          fullName: newUser.full_name,
          email: newUser.email,
          roleId: newUser.role_id,
          role: 'STAFF',
          status: newUser.status,
          createdAt: newUser.created_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Query user and joined role
    const sql = `
      SELECT u.id, u.full_name, u.email, u.password_hash, u.role_id, u.status, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1
    `;
    const result = await query(sql, [normalizedEmail]);

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
      return;
    }

    const user = result.rows[0];

    // Check account status
    if (user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
      return;
    }

    // Verify password (handle case where account was registered via Google only)
    if (!user.password_hash) {
      res.status(401).json({ success: false, message: 'Invalid email or password credentials.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
      return;
    }

    // Generate JWT
    const token = await issueAuthToken(user.id, user.email);

    // Log audit
    await logAudit({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'USER_LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      details: { method: 'EMAIL_PASSWORD' },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          roleId: user.role_id,
          role: user.role_name as UserRole,
          status: user.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tokenToVerify = req.body.idToken || req.body.credential;
    if (!config.google.clientId || config.google.clientId.startsWith('your-')) {
      res.status(503).json({
        success: false,
        message: 'Google Sign-In is not configured. Set GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID.',
      });
      return;
    }

    if (typeof tokenToVerify !== 'string' || tokenToVerify.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Google ID token or credential is required.',
      });
      return;
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: config.google.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      res.status(401).json({
        success: false,
        message: 'Google identity verification failed.',
      });
      return;
    }

    if (!payload?.email || payload.email_verified !== true || !payload.sub) {
      res.status(401).json({
        success: false,
        message: 'Google identity verification failed.',
      });
      return;
    }

    const googleEmail = payload.email.toLowerCase();
    const googleName = payload.name || payload.email.split('@')[0];
    const googleSub = payload.sub;
    const avatarUrl = payload.picture || '';

    const findSql = `
      SELECT u.id, u.full_name, u.email, u.role_id, u.status, u.google_id, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1 OR u.google_id = $2
    `;
    const existing = await query(findSql, [googleEmail, googleSub]);

    let user: any;

    if (existing.rows.length > 0) {
      user = existing.rows[0];
      if (user.status !== 'ACTIVE') {
        res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact your administrator.',
        });
        return;
      }
      if (user.google_id && user.google_id !== googleSub) {
        res.status(409).json({
          success: false,
          message: 'This email is already linked to a different Google account.',
        });
        return;
      }
      // Update google_id if not linked
      await query('UPDATE users SET google_id = COALESCE(google_id, $1), updated_at = NOW() WHERE id = $2', [googleSub, user.id]);
    } else {
      const roleRes = await query('SELECT id, name FROM roles WHERE name = $1', ['STAFF']);
      const defaultRoleId = roleRes.rows[0]?.id;
      if (!defaultRoleId) {
        throw new Error('The default STAFF role is missing from the database.');
      }

      const insertSql = `
        INSERT INTO users (full_name, email, google_id, avatar_url, role_id, status)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
        RETURNING id, full_name, email, role_id, status
      `;
      const created = await query(insertSql, [googleName, googleEmail, googleSub, avatarUrl, defaultRoleId]);
      user = {
        ...created.rows[0],
        role_name: 'STAFF',
      };

      await logAudit({
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'USER_REGISTER',
        entityType: 'USER',
        entityId: user.id,
        details: { method: 'GOOGLE_OAUTH', role: 'STAFF' },
        ipAddress: req.ip,
      });
    }

    // Issue JWT
    const token = await issueAuthToken(user.id, user.email);

    await logAudit({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'USER_LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      details: { method: 'GOOGLE_OAUTH' },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Google Sign-In successful',
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          roleId: user.role_id,
          role: user.role_name as UserRole,
          status: user.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice('Bearer '.length)
        : '';
      await revokeAuthToken(req.user.id, token);
      await logAudit({
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'USER_LOGOUT',
        entityType: 'AUTH',
        entityId: req.user.id,
        ipAddress: req.ip,
      });
    }
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const sql = `
      SELECT u.id, u.full_name, u.email, u.role_id, u.status, u.google_id, u.avatar_url, u.created_at, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await query(sql, [req.user.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        roleId: user.role_id,
        role: user.role_name as UserRole,
        status: user.status,
        avatarUrl: user.avatar_url,
        isGoogleAccount: !!user.google_id,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const result = await query('SELECT id, email, full_name FROM users WHERE email = $1', [normalizedEmail]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Generate cryptographically secure reset token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate existing active tokens for this user
      await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

      // Save token
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      );

      // Dispatch email
      let emailPreviewUrl: string | undefined;
      try {
        const emailResult = await sendPasswordResetEmail(user.email, rawToken);
        emailPreviewUrl = emailResult.previewUrl;
      } catch (error) {
        await query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
        console.error(
          'Password reset email delivery failed:',
          error instanceof Error ? error.message : 'Unknown email delivery error'
        );
      }

      await logAudit({
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'AUTH',
        entityId: user.id,
        ipAddress: req.ip,
      });

      // In development with Ethereal, return the preview URL so the UI can show it
      if (emailPreviewUrl) {
        res.status(200).json({
          success: true,
          message: 'Password reset email sent! (Dev mode: open the preview link below)',
          devEmailPreviewUrl: emailPreviewUrl,
        });
        return;
      }
    }

    // Always respond with identical safe message to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const client = await getClient();
  try {
    const { token, newPassword } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await client.query('BEGIN');
    const tokenQuery = `
      SELECT id, user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token_hash = $1
      FOR UPDATE
    `;
    const tokenRes = await client.query(tokenQuery, [tokenHash]);

    if (tokenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link.',
      });
      return;
    }

    const resetRecord = tokenRes.rows[0];

    if (resetRecord.used_at !== null) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'This password reset link has already been used.',
      });
      return;
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'This password reset link has expired. Please request a new one.',
      });
      return;
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    const claimedToken = await client.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE id = $1 AND used_at IS NULL AND expires_at > NOW()
       RETURNING id`,
      [resetRecord.id]
    );
    if (claimedToken.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link.',
      });
      return;
    }

    await client.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newHash,
      resetRecord.user_id,
    ]);
    await client.query(
      'UPDATE user_refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
      [resetRecord.user_id]
    );
    await client.query('COMMIT');

    await logAudit({
      actorUserId: resetRecord.user_id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'AUTH',
      entityId: resetRecord.user_id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Your password has been successfully reset. You may now log in with your new credentials.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { fullName } = req.body;
    const updateSql = `
      UPDATE users 
      SET full_name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, full_name, email, role_id, status
    `;
    const result = await query(updateSql, [fullName.trim(), req.user.id]);
    const updatedUser = result.rows[0];

    await logAudit({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'USER',
      entityId: req.user.id,
      details: { newFullName: fullName },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { password_hash } = userRes.rows[0];
    if (!password_hash) {
      res.status(400).json({
        success: false,
        message: 'This account does not have a local password (OAuth login).',
      });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, password_hash);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect.',
      });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      newHash,
      req.user.id,
    ]);
    await revokeUserTokens(req.user.id);

    await logAudit({
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      action: 'PASSWORD_CHANGED',
      entityType: 'AUTH',
      entityId: req.user.id,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};
