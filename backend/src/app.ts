import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { config } from './config/env.js';

export const createApp = (): Application => {
  const app = express();

  // Request ID and Structured Logging (Task 06)
  app.use(requestIdMiddleware);

  // Security Middleware
  app.use(helmet());

  // CORS Configuration
  app.use(
    cors({
      origin: [
        config.clientUrl,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID'],
    })
  );

  // Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api', apiRouter);

  // Root endpoint info
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'SkillForge Retail Inventory & Stock Management API',
      version: '1.0.0',
      status: 'ONLINE',
      docs: '/api/health',
    });
  });

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'The requested API endpoint was not found.',
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
