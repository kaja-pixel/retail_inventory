import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbStart = Date.now();
    await query('SELECT 1');
    const dbLatency = Date.now() - dbStart;

    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      database: {
        status: 'CONNECTED',
        latencyMs: dbLatency,
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: {
        status: 'DISCONNECTED',
        error: error.message,
      },
    });
  }
};

