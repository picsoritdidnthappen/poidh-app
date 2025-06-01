import { Client } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import serverEnv from '@/utils/serverEnv';

const DATABASE_URL = serverEnv.DATABASE_URL;
const DATABASE_SCHEMA = 'public';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL env var is required');
}
if (!DATABASE_SCHEMA) {
  throw new Error('DATABASE_SCHEMA env var is required');
}

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

async function ensureSchemaAndTable(client: Client) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${DATABASE_SCHEMA}"`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${DATABASE_SCHEMA}".migrations (
      version     BIGINT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function currentVersion(client: Client): Promise<number> {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(version), 0) AS version FROM "${DATABASE_SCHEMA}".migrations`
  );
  return Number(rows[0].version);
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

function extractVersion(fileName: string): number {
  const [num] = fileName.split('_');
  const v = Number(num);
  if (Number.isNaN(v)) throw new Error(`Bad migration file name: ${fileName}`);
  return v;
}

async function applyMigration(
  client: Client,
  fileName: string,
  version: number
) {
  const rawSql = await fs.readFile(path.join(MIGRATIONS_DIR, fileName), 'utf8');
  const sql = rawSql.replace(/:schema\b/g, DATABASE_SCHEMA);

  console.log(`▶︎ Applying ${fileName}`);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO "${DATABASE_SCHEMA}".migrations(version) VALUES ($1)`,
      [version]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await ensureSchemaAndTable(client);
    const current = await currentVersion(client);

    const files = await listMigrationFiles();
    for (const file of files) {
      const version = extractVersion(file);
      if (version > current) {
        await applyMigration(client, file, version);
      }
    }

    console.log('✓ Database is up-to-date');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
