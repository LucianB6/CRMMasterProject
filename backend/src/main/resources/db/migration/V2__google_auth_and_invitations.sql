ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS picture_url TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_users_google_sub'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT uq_users_google_sub UNIQUE (google_sub);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS plan_code VARCHAR(64);

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    invited_email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ NULL,
    CONSTRAINT fk_invitations_company FOREIGN KEY (company_id) REFERENCES companies(id),
    CONSTRAINT uq_invitations_token UNIQUE (token),
    CONSTRAINT chk_invitations_role CHECK (role IN ('AGENT')),
    CONSTRAINT chk_invitations_status CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'))
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_company_email_status ON invitations(company_id, invited_email, status);
