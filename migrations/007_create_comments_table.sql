CREATE TABLE IF NOT EXISTS :schema."Comments" (
    id             SERIAL         PRIMARY KEY,
    bounty_id      INTEGER        NOT NULL,
    chain_id       INTEGER        NOT NULL,
    parent_id      INTEGER        NULL,
    user_address   TEXT           NOT NULL,
    body           TEXT           NOT NULL,
    upvotes        INTEGER        NOT NULL DEFAULT 0,
    downvotes      INTEGER        NOT NULL DEFAULT 0,
    created_at     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP(3)   NULL,

    CONSTRAINT "Comments_bounty_chain_fkey"
        FOREIGN KEY ("chain_id", "bounty_id")
        REFERENCES :schema."Bounties"("chain_id", "id")
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT "Comments_user_address_fkey"
        FOREIGN KEY ("user_address")
        REFERENCES :schema."Users"("address")
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT "Comments_parent_id_fkey"
        FOREIGN KEY ("parent_id")
        REFERENCES :schema."Comments"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "Comments_bounty_id_idx"
  ON :schema."Comments"("bounty_id");

CREATE INDEX IF NOT EXISTS "Comments_parent_id_idx"
  ON :schema."Comments"("parent_id");

CREATE INDEX IF NOT EXISTS "Comments_user_address_idx"
  ON :schema."Comments"("user_address");
