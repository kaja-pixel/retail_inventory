import fs from 'fs';
import path from 'path';
import { pool } from '../../config/db.js';

export const resetTestDb = async (): Promise<void> => {
  // Confirm we are on test database
  const res = await pool.query('SELECT current_database()');
  const dbName = res.rows[0].current_database;
  if (!dbName.includes('test')) {
    throw new Error(`CRITICAL: Attempted to run test reset on database "${dbName}"!`);
  }

  // Find root directory path from process.cwd() (backend directory)
  const schemaPath = path.resolve(process.cwd(), '../database/schema.sql');
  const seedPath = path.resolve(process.cwd(), '../database/seed.sql');

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const seedSql = fs.readFileSync(seedPath, 'utf-8');

  // Truncate existing data tables safely with CASCADE
  await pool.query(`
    TRUNCATE TABLE 
      audit_logs,
      notifications,
      inventory_transactions,
      products,
      users
    RESTART IDENTITY CASCADE;
  `);

  // Run schema (creates tables/indexes if not exist)
  await pool.query(schemaSql);

  // Run seed data
  await pool.query(seedSql);
};
