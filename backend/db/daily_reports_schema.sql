-- Daily Reports schema alignment for PostgreSQL (pgAdmin-friendly)
-- Safe to re-run; uses IF NOT EXISTS and explicit checks where needed.

-- Core tables
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  agent_membership_id UUID NOT NULL,
  report_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  submitted_at TIMESTAMPTZ,
  submitted_by_membership_id UUID,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_report_inputs (
  daily_report_id UUID PRIMARY KEY,
  outbound_dials INTEGER NOT NULL DEFAULT 0,
  pickups INTEGER NOT NULL DEFAULT 0,
  conversations_30s_plus INTEGER NOT NULL DEFAULT 0,
  sales_call_booked_from_outbound INTEGER NOT NULL DEFAULT 0,
  sales_call_on_calendar INTEGER NOT NULL DEFAULT 0,
  no_show INTEGER NOT NULL DEFAULT 0,
  reschedule_request INTEGER NOT NULL DEFAULT 0,
  cancel INTEGER NOT NULL DEFAULT 0,
  deposits INTEGER NOT NULL DEFAULT 0,
  sales_one_call_close INTEGER NOT NULL DEFAULT 0,
  followup_sales INTEGER NOT NULL DEFAULT 0,
  upsell_conversation_taken INTEGER NOT NULL DEFAULT 0,
  upsells INTEGER NOT NULL DEFAULT 0,
  contract_value NUMERIC(19,2) NOT NULL DEFAULT 0,
  new_cash_collected NUMERIC(19,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Columns (idempotent)
ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS agent_membership_id UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS report_date DATE NOT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by_membership_id UUID,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL;

ALTER TABLE daily_report_inputs
  ADD COLUMN IF NOT EXISTS outbound_dials INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickups INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversations_30s_plus INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_call_booked_from_outbound INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_call_on_calendar INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reschedule_request INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_one_call_close INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followup_sales INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upsell_conversation_taken INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upsells INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_value NUMERIC(19,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_cash_collected NUMERIC(19,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_agent_date
  ON daily_reports (agent_membership_id, report_date);

CREATE INDEX IF NOT EXISTS idx_reports_company_date
  ON daily_reports (company_id, report_date);

CREATE INDEX IF NOT EXISTS idx_reports_agent_date
  ON daily_reports (agent_membership_id, report_date);

-- Ensure a single FK from daily_report_inputs to daily_reports
DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'daily_report_inputs'
      AND c.contype = 'f'
      AND c.conname <> 'fk_daily_report_inputs_report'
  LOOP
    EXECUTE format('ALTER TABLE daily_report_inputs DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_daily_report_inputs_report'
      AND table_name = 'daily_report_inputs'
  ) THEN
    ALTER TABLE daily_report_inputs
      ADD CONSTRAINT fk_daily_report_inputs_report
      FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id);
  END IF;
END $$;
