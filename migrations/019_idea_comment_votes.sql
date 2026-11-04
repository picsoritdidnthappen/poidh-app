-- Upvotes and downvotes for individual draft comments.
-- Kept separate from existing bounty comment ratings.

CREATE TABLE IF NOT EXISTS "IdeaCommentVotes" (
  "comment_id" INTEGER NOT NULL,
  "address" VARCHAR(42) NOT NULL,
  "value" INTEGER NOT NULL CHECK ("value" IN (-1, 1)),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "IdeaCommentVotes_pkey"
    PRIMARY KEY ("comment_id", "address"),

  CONSTRAINT "IdeaCommentVotes_comment_id_fkey"
    FOREIGN KEY ("comment_id")
    REFERENCES "IdeaComments"("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IdeaCommentVotes_comment_id_idx"
  ON "IdeaCommentVotes" ("comment_id");
