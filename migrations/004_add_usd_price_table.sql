CREATE TABLE IF NOT EXISTS :schema."Price" (
  id          SERIAL PRIMARY KEY,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  degen_usd   NUMERIC(20, 8),
  eth_usd     NUMERIC(20, 8)
);
