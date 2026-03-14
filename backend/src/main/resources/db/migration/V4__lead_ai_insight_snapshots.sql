CREATE TABLE IF NOT EXISTS lead_ai_insight_snapshots (
    id UUID PRIMARY KEY,
    lead_id UUID NOT NULL,
    company_id UUID NOT NULL,
    latest_insight_memory_id UUID NULL,
    score INTEGER NOT NULL,
    relationship_sentiment VARCHAR(32),
    relationship_risk_level VARCHAR(32),
    relationship_trend VARCHAR(32),
    relationship_key_blocker TEXT,
    confidence_score DOUBLE PRECISION NOT NULL,
    confidence_level VARCHAR(32),
    guidance_source VARCHAR(32),
    recommended_action TEXT NOT NULL,
    suggested_approach TEXT NOT NULL,
    next_best_action TEXT,
    what_changed TEXT,
    explainability TEXT,
    score_factors TEXT,
    generated_at TIMESTAMPTZ NOT NULL,
    last_regenerated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_lead_ai_insight_snapshots_lead_company UNIQUE (lead_id, company_id),
    CONSTRAINT fk_lead_ai_insight_snapshots_lead FOREIGN KEY (lead_id) REFERENCES leads(id),
    CONSTRAINT fk_lead_ai_insight_snapshots_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_ai_insight_snapshots_lead_company
    ON lead_ai_insight_snapshots (lead_id, company_id);

CREATE INDEX IF NOT EXISTS idx_lead_ai_insight_snapshots_company_updated
    ON lead_ai_insight_snapshots (company_id, updated_at DESC);
