-- Users schema alignment for PostgreSQL (pgAdmin-friendly)
-- Safe to re-run; uses IF NOT EXISTS for column additions.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
