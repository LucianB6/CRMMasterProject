package com.salesway.leads.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.salesway.leads.enums.LeadEventType;

import java.time.Instant;
import java.util.UUID;

public record LeadEventResponse(
        UUID eventId,
        LeadEventType type,
        Instant createdAt,
        UUID actorUserId,
        JsonNode payload,
        String summary
) {
}
