CREATE TABLE IF NOT EXISTS page_view_events (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES users(id),
    path VARCHAR(255) NOT NULL,
    route_name VARCHAR(255),
    source VARCHAR(64),
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_view_events_company_created_at
    ON page_view_events(company_id, created_at);

CREATE INDEX IF NOT EXISTS idx_page_view_events_user_created_at
    ON page_view_events(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_page_view_events_path_created_at
    ON page_view_events(path, created_at);
