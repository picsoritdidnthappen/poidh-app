CREATE TABLE IF NOT EXISTS :schema."AuthNonces" (
    nonce       TEXT          PRIMARY KEY,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at     TIMESTAMPTZ   NULL
);

CREATE TABLE IF NOT EXISTS :schema."Sessions" (
    id          SERIAL        PRIMARY KEY,
    token_hash  TEXT          NOT NULL UNIQUE,
    address     TEXT          NOT NULL,
    host        TEXT          NOT NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
