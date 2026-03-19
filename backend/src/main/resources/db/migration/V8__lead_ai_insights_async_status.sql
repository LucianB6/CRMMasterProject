ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS ai_insights_status VARCHAR(32);

ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS ai_insights_error TEXT;
