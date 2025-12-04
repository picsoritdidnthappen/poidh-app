DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Reaction') THEN
        CREATE TYPE :schema."Reaction" AS ENUM ('upvote', 'downvote');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS :schema."Reactions" (
    id          SERIAL          PRIMARY KEY,
    comment_id  INTEGER         NOT NULL,
    type        :schema."Reaction" NOT NULL,

    CONSTRAINT "Reactions_comment_id_fkey"
        FOREIGN KEY ("comment_id")
        REFERENCES :schema."Comments"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "Reactions_comment_id_idx"
  ON :schema."Reactions"("comment_id");
