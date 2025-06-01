CREATE TABLE IF NOT EXISTS :schema."Ban" (
  id         SERIAL PRIMARY KEY,
  chain_id   INTEGER NOT NULL,
  bounty_id  INTEGER,
  banned_by  TEXT    NOT NULL,
  banned_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claim_id   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_bounty_id ON :schema."Ban"(bounty_id);
CREATE INDEX IF NOT EXISTS idx_claim_id  ON :schema."Ban"(claim_id);
