ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS subscription_grace_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS leads_deactivated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_subscription_grace_until
    ON companies (subscription_grace_until)
    WHERE subscription_grace_until IS NOT NULL
      AND leads_deactivated_at IS NULL;
