CREATE TABLE IF NOT EXISTS :schema."BountiesExtra" (
  bounty_id INT NOT NULL,
  chain_id INT NOT NULL,
  location TEXT,
  PRIMARY KEY (bounty_id, chain_id)
);
