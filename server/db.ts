import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL?.trim();

export const isDatabaseConfigured = Boolean(databaseUrl);

export const pool = isDatabaseConfigured
  ? new Pool({
      connectionString: databaseUrl,
      ssl:
        databaseUrl?.includes('sslmode=require') || process.env.PGSSLMODE === 'require'
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : null;

let initialized = false;

export async function initDatabase(): Promise<void> {
  if (!pool || initialized) return;

  const client = await pool.connect();
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schemaSql);

    const { rows } = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM patterns');
    const patternCount = parseInt(rows[0]?.count ?? '0', 10);

    if (patternCount === 0) {
      const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
      await client.query(seedSql);
      console.log('[StitchCraft] PostgreSQL schema and seed data initialized.');
    }

    initialized = true;
  } finally {
    client.release();
  }
}
