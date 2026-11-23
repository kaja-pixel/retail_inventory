import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './env.js';

// Safety Guard: In test environment, ensure we never point to production or development databases
if (config.nodeEnv === 'test') {
  const dbName = config.database.name.toLowerCase();
  if (!dbName.includes('test') && !dbName.endsWith('_test_db')) {
    throw new Error(
      `CRITICAL SAFETY ERROR: Automated tests attempted to connect to non-test database: "${config.database.name}". Test execution halted.`
    );
  }
}

export const pool = new Pool(
  config.database.connectionString
    ? { connectionString: config.database.connectionString }
    : {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        max: config.nodeEnv === 'test' ? 10 : 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development' && duration > 100) {
      console.log(`[SQL slow query] ${duration}ms: ${text.slice(0, 100)}`);
    }
    return res;
  } catch (error) {
    if (config.nodeEnv !== 'test') {
      console.error('[SQL Error]', { text, error });
    }
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export const closePool = async (): Promise<void> => {
  await pool.end();
};
