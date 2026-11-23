import { createApp } from './app.js';
import { config } from './config/env.js';
import { query } from './config/db.js';

const startServer = async () => {
  try {
    // Verify database connection
    console.log('Testing PostgreSQL connection...');
    await query('SELECT NOW()');
    console.log(`Connected to PostgreSQL database: "${config.database.name}" successfully.`);

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`SkillForge Inventory API Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Health Check: http://localhost:${config.port}/api/health`);
      console.log(`Client URL: ${config.clientUrl}`);
      console.log(`====================================================`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log('Received termination signal. Shutting down gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();

