package com.salesway.email.dto;

import java.time.Instant;

public record PasswordResetEmailPayload(
        String toEmail,
        String resetLink,
        Instant expiresAt
) {
}
