import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId || (req.headers['x-request-id'] as string) || 'req-unknown';
  let statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  let message = err.message || 'Internal server error';

  // Specific PostgreSQL error handling
  if (err.code === '23505') {
    // Unique violation (e.g. duplicate SKU or Email)
    statusCode = 409;
    message = 'A record with this information already exists (e.g. duplicate SKU or Email).';
  } else if (err.code === '23503') {
    // Foreign key violation
    statusCode = 400;
    message = 'Referenced resource does not exist or cannot be removed due to existing dependencies.';
  } else if (err.code === '23514') {
    // Check constraint violation
    statusCode = 400;
    message = 'Data value violates constraint rules (e.g. negative price or negative stock quantity).';
  } else if (err.code === '22P02') {
    // Invalid text representation (e.g. invalid UUID format like /products/999)
    statusCode = 404;
    message = 'Product not found';
  }

  // Structured error logging (Task 06)
  logger.error({
    timestamp: new Date().toISOString(),
    level: 'error',
    requestId,
    method: req.method,
    endpoint: req.originalUrl || req.url,
    statusCode,
    message,
    ...(config.nodeEnv !== 'production' && err.stack ? { stack: err.stack } : {}),
  });

  // Ensure X-Request-ID header is always included
  if (!res.headersSent) {
    res.setHeader('X-Request-ID', requestId);
    res.status(statusCode >= 100 && statusCode < 600 ? statusCode : 500).json({
      success: false,
      message,
      ...(config.nodeEnv === 'development' && err.stack ? { stack: err.stack } : {}),
    });
  }
};
