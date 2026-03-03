package com.salesway.invitations.dto;

import java.time.Instant;

public record InvitationPreviewResponse(
        String status,
        String invitedEmail,
        String companyName,
        Instant expiresAt
) {
}
