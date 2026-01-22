-- Calendar events schema alignment for PostgreSQL (pgAdmin-friendly)
-- Safe to re-run; uses IF NOT EXISTS and explicit checks where needed.

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY,
  membership_id UUID NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS membership_id UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS event_date DATE NOT NULL,
  ADD COLUMN IF NOT EXISTS start_time TIME NOT NULL,
  ADD COLUMN IF NOT EXISTS end_time TIME NOT NULL,
  ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_membership_date
  ON calendar_events (membership_id, event_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_calendar_events_membership'
      AND table_name = 'calendar_events'
  ) THEN
    ALTER TABLE calendar_events
      ADD CONSTRAINT fk_calendar_events_membership
      FOREIGN KEY (membership_id) REFERENCES company_memberships(id);
  END IF;
END $$;
