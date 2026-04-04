ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(64),
    ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_stripe_customer_id
    ON companies (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_stripe_subscription_id
    ON companies (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS processed_stripe_events (
    id UUID PRIMARY KEY,
    stripe_event_id VARCHAR(255) NOT NULL,
    stripe_event_type VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_processed_stripe_events_event_id UNIQUE (stripe_event_id)
);

CREATE TABLE IF NOT EXISTS pending_signups (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    plan_code VARCHAR(64) NOT NULL,
    lookup_key VARCHAR(128) NOT NULL,
    stripe_checkout_session_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    completed_user_id UUID,
    completed_company_id UUID,
    status VARCHAR(32) NOT NULL,
    failure_reason VARCHAR(500),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_signups_email_status
    ON pending_signups (email, status);
