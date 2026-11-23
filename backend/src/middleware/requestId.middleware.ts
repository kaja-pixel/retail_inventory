import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Extract incoming X-Request-ID or generate new unique ID
  const incomingId = req.headers['x-request-id'];
  const requestId = (typeof incomingId === 'string' && incomingId.trim().length > 0)
    ? incomingId.trim()
    : `req-${crypto.randomBytes(4).toString('hex')}`;

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    // Structured logging according to Task 06 specification
    logger.log({
      level,
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode,
      durationMs,
      message: `${req.method} ${req.originalUrl || req.url} ${statusCode} (${durationMs}ms)`,
    });
  });

  next();
};
