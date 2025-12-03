CREATE TABLE IF NOT EXISTS :schema."UsersExtra" (
    address        TEXT         NOT NULL,
    pfp_url        TEXT         NULL,
    ens            TEXT         NULL,
    degen_name     TEXT         NULL,
    farcaster_tag  TEXT         NULL,
    twitter_tag    TEXT         NULL,
    last_updated   TIMESTAMP(3) NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsersExtra_pkey"
        PRIMARY KEY ("address"),

    CONSTRAINT "UsersExtra_address_fkey"
        FOREIGN KEY ("address")
        REFERENCES :schema."Users"("address")
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
);
