import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend or root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DATABASE_URL = 
  process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/enterprise_erp';

export const pgPool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  version?: string;
  database?: string;
  timestamp?: string;
  error?: string;
}> {
  try {
    const result = await pgPool.query('SELECT NOW() as timestamp, current_database() as database, version() as version');
    return {
      connected: true,
      timestamp: result.rows[0].timestamp,
      database: result.rows[0].database,
      version: result.rows[0].version
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || String(err)
    };
  }
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
  tenantContext?: { companyId?: string; isPlatformAdmin?: boolean }
): Promise<T> {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    
    // Set RLS session context if provided
    if (tenantContext?.companyId) {
      await client.query(`SET LOCAL app.current_company_id = '${tenantContext.companyId}'`);
    }
    if (tenantContext?.isPlatformAdmin) {
      await client.query(`SET LOCAL app.is_platform_admin = 'true'`);
    }

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabasePool(): Promise<void> {
  await pgPool.end();
}
