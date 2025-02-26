import { Pool } from 'pg';
import serverEnv from '@/utils/serverEnv';

const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
});

async function migrate() {
  try {
    await createBanTable();
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

async function createBanTable() {
  await pool.query(`
    CREATE TABLE "Ban" (
      id SERIAL PRIMARY KEY,
      chain_id INTEGER NOT NULL,
      bounty_id INTEGER,
      banned_by TEXT NOT NULL,
      banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      claim_id INTEGER
    );
  
    CREATE INDEX idx_bounty_id ON "Ban"(bounty_id);
    CREATE INDEX idx_claim_id ON "Ban"(claim_id);
  `);
}

migrate();
