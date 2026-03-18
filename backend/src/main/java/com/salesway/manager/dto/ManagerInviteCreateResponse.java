package com.salesway.manager.dto;

import java.time.Instant;
import java.util.UUID;

public record ManagerInviteCreateResponse(
        UUID invitationId,
        String inviteToken,
        String inviteLink,
        Instant expiresAt,
        String status
) {
}
