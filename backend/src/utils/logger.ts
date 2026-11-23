import winston from 'winston';

const isTest = process.env.NODE_ENV === 'test';

export const logger = winston.createLogger({
  level: isTest ? 'error' : (process.env.LOG_LEVEL || 'info'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  ),
  defaultMeta: { service: 'retail-inventory-api' },
  transports: [
    new winston.transports.Console({
      silent: isTest, // Keep test output clean during automated test suites
    }),
  ],
});
