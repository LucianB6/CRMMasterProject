-- Goals schema alignment for PostgreSQL (pgAdmin-friendly)
-- Safe to re-run; uses IF NOT EXISTS for table creation.

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  membership_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  metric_key VARCHAR(255) NOT NULL,
  target_value NUMERIC(19, 2) NOT NULL,
  start_date DATE,
  end_date DATE
);

CREATE INDEX IF NOT EXISTS idx_goals_membership ON goals (membership_id);
