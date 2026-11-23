import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '../config/db.js';
import { config } from '../config/env.js';

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export const issueAuthToken = async (userId: string, email: string): Promise<string> => {
  const token = jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'], jwtid: crypto.randomUUID() }
  );
  const decoded = jwt.decode(token);

  if (!decoded || typeof decoded === 'string' || typeof decoded.exp !== 'number') {
    throw new Error('Unable to determine authentication token expiration.');
  }

  await query(
    `INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(token), new Date(decoded.exp * 1000)]
  );

  return token;
};

export const isAuthTokenActive = async (userId: string, token: string): Promise<boolean> => {
  const result = await query(
    `SELECT id FROM user_refresh_tokens
     WHERE user_id = $1 AND token_hash = $2 AND revoked = FALSE AND expires_at > NOW()`,
    [userId, hashToken(token)]
  );
  return result.rows.length > 0;
};

export const revokeAuthToken = async (userId: string, token: string): Promise<void> => {
  await query(
    `UPDATE user_refresh_tokens SET revoked = TRUE
     WHERE user_id = $1 AND token_hash = $2`,
    [userId, hashToken(token)]
  );
};

export const revokeUserTokens = async (userId: string): Promise<void> => {
  await query(
    'UPDATE user_refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
    [userId]
  );
};
