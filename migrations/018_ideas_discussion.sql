-- Idea voting: one vote per wallet per draft.
CREATE TABLE IF NOT EXISTS "IdeaVotes" (
  "cid" VARCHAR(128) NOT NULL,
  "address" VARCHAR(42) NOT NULL,
  "value" INTEGER NOT NULL CHECK ("value" IN (-1, 1)),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "IdeaVotes_pkey" PRIMARY KEY ("cid", "address")
);

CREATE INDEX IF NOT EXISTS "IdeaVotes_cid_idx"
  ON "IdeaVotes" ("cid");


-- Comments and threaded replies on bounty drafts.
CREATE TABLE IF NOT EXISTS "IdeaComments" (
  "id" SERIAL PRIMARY KEY,
  "cid" VARCHAR(128) NOT NULL,
  "user_address" VARCHAR(42) NOT NULL,
  "parent_id" INTEGER NULL REFERENCES "IdeaComments"("id"),
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS "IdeaComments_cid_created_at_idx"
  ON "IdeaComments" ("cid", "created_at");

CREATE INDEX IF NOT EXISTS "IdeaComments_user_address_created_at_idx"
  ON "IdeaComments" ("user_address", "created_at");

CREATE INDEX IF NOT EXISTS "IdeaComments_parent_id_idx"
  ON "IdeaComments" ("parent_id");
