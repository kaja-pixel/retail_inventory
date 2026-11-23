import dotenv from 'dotenv';
import path from 'path';

// If running in test mode, load .env.test if present, then fallback to .env
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
}
dotenv.config();

const requiredSecret = (name: string): string => {
  const value = process.env[name];
  // In test mode, provide default secure test secret if not set
  if (process.env.NODE_ENV === 'test' && !value) {
    return 'test-super-secret-key-that-is-at-least-32-chars-long';
  }
  if (
    !value ||
    value.length < 32 ||
    value.toLowerCase().includes('your_') ||
    value.toLowerCase().includes('replace-with')
  ) {
    throw new Error(`${name} must be configured with a secret of at least 32 characters.`);
  }
  return value;
};

const isTest = process.env.NODE_ENV === 'test';

// Parse database URL or individual parameters
const getDatabaseConfig = () => {
  if (isTest) {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (testUrl) {
      try {
        const parsed = new URL(testUrl);
        return {
          host: parsed.hostname,
          port: parseInt(parsed.port || '5432', 10),
          name: parsed.pathname.replace(/^\//, ''),
          user: parsed.username,
          password: decodeURIComponent(parsed.password || ''),
          connectionString: testUrl,
        };
      } catch {
        // Fall back to individual vars
      }
    }
    return {
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432', 10),
      name: process.env.TEST_DB_NAME || 'skillforge_inventory_test_db',
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || '',
      connectionString: undefined,
    };
  }

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        name: parsed.pathname.replace(/^\//, ''),
        user: parsed.username,
        password: decodeURIComponent(parsed.password || ''),
        connectionString: dbUrl,
      };
    } catch {
      // Fall back to individual vars
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'skillforge_inventory_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    connectionString: undefined,
  };
};

const dbConfig = getDatabaseConfig();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  database: dbConfig,
  jwt: {
    secret: requiredSecret('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@skillforge-inventory.com',
  },
};
