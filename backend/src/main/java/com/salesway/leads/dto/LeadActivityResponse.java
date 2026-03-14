package com.salesway.leads.dto;

import java.time.Instant;
import java.util.UUID;

public record LeadActivityResponse(
        UUID id,
        String type,
        String title,
        String description,
        String actorName,
        Instant createdAt
) {
}
