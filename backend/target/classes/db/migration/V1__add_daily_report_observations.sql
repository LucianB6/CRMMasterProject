ALTER TABLE daily_report_inputs
    ADD COLUMN IF NOT EXISTS observations TEXT;
