ALTER TABLE :schema."UsersExtra"
ADD COLUMN "zkpassport_unique_id" TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UsersExtra_zkpassport_unique_id_key"
  ON :schema."UsersExtra"("zkpassport_unique_id");
