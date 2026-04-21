-- Keep claim bans aligned with indexer-stable on-chain ids and current internal claim ids.

-- 1) Backfill claim_on_chain_id from the current Claims row when still NULL.
UPDATE :schema."Ban" b
SET claim_on_chain_id = c.on_chain_id
FROM :schema."Claims" c
WHERE b.claim_id IS NOT NULL
  AND b.chain_id = c.chain_id
  AND b.claim_id = c.id
  AND b.claim_on_chain_id IS NULL;

-- 2) Point ban.claim_id at a current Claims.id for the same (chain, on-chain claim id).
--    Internal ids can change when indexer offsets change; on_chain_id is stable.
UPDATE :schema."Ban" b
SET claim_id = c.id
FROM (
  SELECT DISTINCT ON (chain_id, on_chain_id)
    chain_id,
    on_chain_id,
    id
  FROM :schema."Claims"
  ORDER BY chain_id, on_chain_id, id DESC
) c
WHERE b.claim_on_chain_id IS NOT NULL
  AND b.chain_id = c.chain_id
  AND c.on_chain_id = b.claim_on_chain_id
  AND (b.claim_id IS DISTINCT FROM c.id);
