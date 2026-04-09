CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_signups_active_email
    ON pending_signups (LOWER(email))
    WHERE status IN ('PENDING', 'CHECKOUT_CREATED');
