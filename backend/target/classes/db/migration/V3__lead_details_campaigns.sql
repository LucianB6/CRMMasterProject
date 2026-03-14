CREATE TABLE IF NOT EXISTS lead_form_campaigns (
    id UUID PRIMARY KEY,
    lead_form_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    campaign_code VARCHAR(255) NOT NULL,
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_lead_form_campaigns_form FOREIGN KEY (lead_form_id) REFERENCES lead_forms(id),
    CONSTRAINT chk_lead_form_campaigns_channel CHECK (channel IN ('META', 'GOOGLE', 'ORGANIC', 'OTHER', 'FORM')),
    CONSTRAINT chk_lead_form_campaigns_name_nonblank CHECK (length(btrim(name)) > 0),
    CONSTRAINT chk_lead_form_campaigns_code_nonblank CHECK (length(btrim(campaign_code)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_lead_form_campaigns_form_created
    ON lead_form_campaigns (lead_form_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_form_campaigns_form_active
    ON lead_form_campaigns (lead_form_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_form_campaigns_form_code_active_ci
    ON lead_form_campaigns (lead_form_id, lower(campaign_code))
    WHERE is_active = TRUE;

ALTER TABLE lead_answers
    ADD COLUMN IF NOT EXISTS display_order_snapshot INTEGER;

UPDATE lead_answers la
SET display_order_snapshot = q.display_order
FROM lead_form_questions q
WHERE la.display_order_snapshot IS NULL
  AND la.question_id = q.id;

WITH ranked AS (
    SELECT
        la.id,
        row_number() OVER (PARTITION BY la.lead_id ORDER BY la.created_at ASC, la.id ASC) AS rn
    FROM lead_answers la
    WHERE la.display_order_snapshot IS NULL
)
UPDATE lead_answers la
SET display_order_snapshot = ranked.rn
FROM ranked
WHERE la.id = ranked.id;

ALTER TABLE lead_answers
    ALTER COLUMN display_order_snapshot SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_lead_answers_display_order_snapshot'
    ) THEN
        ALTER TABLE lead_answers
            ADD CONSTRAINT chk_lead_answers_display_order_snapshot
            CHECK (display_order_snapshot >= 1);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_lead_answers_lead_display_order
    ON lead_answers (lead_id, display_order_snapshot ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS lead_call_logs (
    id UUID PRIMARY KEY,
    lead_id UUID NOT NULL,
    company_id UUID NOT NULL,
    actor_user_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    outcome VARCHAR(64),
    duration_seconds INTEGER,
    call_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_lead_call_logs_lead FOREIGN KEY (lead_id) REFERENCES leads(id),
    CONSTRAINT fk_lead_call_logs_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT chk_lead_call_logs_title_nonblank CHECK (length(btrim(title)) > 0),
    CONSTRAINT chk_lead_call_logs_duration_nonnegative CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

CREATE INDEX IF NOT EXISTS idx_lead_call_logs_company_lead_created
    ON lead_call_logs (company_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_call_logs_lead_created
    ON lead_call_logs (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_events_company_lead_created
    ON lead_events (company_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_events_company_lead_type_created
    ON lead_events (company_id, lead_id, type, created_at DESC);
