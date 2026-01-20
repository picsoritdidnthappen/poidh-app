CREATE TABLE IF NOT EXISTS public."Notifications" (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event       TEXT NOT NULL,
    data        JSONB NOT NULL,
    send_at     TIMESTAMPTZ
);
