CREATE TABLE IF NOT EXISTS company_usage_balances (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    usage_type VARCHAR(64) NOT NULL,
    period_start DATE NOT NULL,
    used_units INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_company_usage_balances_company_usage_period
        UNIQUE (company_id, usage_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_company_usage_balances_company_period
    ON company_usage_balances (company_id, period_start);
