import { beforeAll } from 'vitest';
import { pool } from '../config/db.js';
import { resetTestDb } from './helpers/dbSetup.js';

beforeAll(async () => {
  // Verify test database connection
  const res = await pool.query('SELECT current_database()');
  const dbName = res.rows[0].current_database;
  if (!dbName.includes('test')) {
    throw new Error(`SAFETY ABORT: Test runner connected to non-test database: ${dbName}`);
  }
  // Initialize and seed baseline test data
  await resetTestDb();
});
