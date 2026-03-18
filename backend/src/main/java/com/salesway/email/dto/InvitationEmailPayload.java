package com.salesway.email.dto;

import java.time.Instant;

public record InvitationEmailPayload(
        String toEmail,
        String fromEmail,
        String companyName,
        Instant expiresAt,
        String inviteLink
) {
}
