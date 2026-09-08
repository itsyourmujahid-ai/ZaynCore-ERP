import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend or root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DATABASE_URL = 
  process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/enterprise_erp';

export async function runMigrations() {
  console.log('[Migration Runner] Connecting to PostgreSQL Database...');
  
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    console.log('[Migration Runner] Connection established successfully.');
    
    // Create migrations tracker table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Locate migrations directory
    const migrationsDir = path.resolve(__dirname, '../../../db/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`[Migration Runner] Found ${migrationFiles.length} migration files in ${migrationsDir}`);

    for (const file of migrationFiles) {
      const res = await client.query('SELECT name FROM schema_migrations WHERE name = $1', [file]);
      if (res.rows.length > 0) {
        console.log(`[Migration Runner] Skipping already applied: ${file}`);
        continue;
      }

      console.log(`[Migration Runner] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      let sql = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migration Runner] Successfully applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migration Runner] Error applying ${file}:`, err);
        throw err;
      }
    }

    // Apply Chart of Accounts seed if not already present
    const seedsDir = path.resolve(__dirname, '../../../db/seeds');
    if (fs.existsSync(seedsDir)) {
      const seedFiles = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
      for (const seedFile of seedFiles) {
        const seedCheck = await client.query('SELECT name FROM schema_migrations WHERE name = $1', [seedFile]);
        if (seedCheck.rows.length === 0) {
          console.log(`[Migration Runner] Applying seed: ${seedFile}...`);
          const sql = fs.readFileSync(path.join(seedsDir, seedFile), 'utf8').replace(/^\uFEFF/, '');
          await client.query('BEGIN');
          try {
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [seedFile]);
            await client.query('COMMIT');
            console.log(`[Migration Runner] Successfully applied seed: ${seedFile}`);
          } catch (seedErr) {
            await client.query('ROLLBACK');
            console.error(`[Migration Runner] Error applying seed ${seedFile}:`, seedErr);
          }
        }
      }
    }

    console.log('[Migration Runner] All migrations executed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('[Migration Runner] Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Migration Runner] Migration failed:', err);
    process.exit(1);
  });
