-- Stable claim bans: internal claim id can change when indexer offsets change; on_chain_id is stable per chain.
ALTER TABLE :schema."Ban" ADD COLUMN IF NOT EXISTS claim_on_chain_id INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_ban_chain_claim_on_chain
  ON :schema."Ban"(chain_id, claim_on_chain_id)
  WHERE claim_on_chain_id IS NOT NULL;

UPDATE :schema."Ban" b
SET claim_on_chain_id = c.on_chain_id
FROM :schema."Claims" c
WHERE b.claim_id IS NOT NULL
  AND b.chain_id = c.chain_id
  AND b.claim_id = c.id
  AND b.claim_on_chain_id IS NULL;
