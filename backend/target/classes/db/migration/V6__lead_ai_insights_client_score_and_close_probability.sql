ALTER TABLE lead_ai_insight_snapshots
    ADD COLUMN IF NOT EXISTS client_score INTEGER NOT NULL DEFAULT 0;

ALTER TABLE lead_ai_insight_snapshots
    ADD COLUMN IF NOT EXISTS next_call_close_probability INTEGER NOT NULL DEFAULT 0;
