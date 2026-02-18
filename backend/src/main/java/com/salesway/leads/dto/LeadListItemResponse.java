package com.salesway.leads.dto;

import java.time.Instant;
import java.util.UUID;

public record LeadListItemResponse(
        UUID leadId,
        String status,
        Instant submittedAt,
        String firstName,
        String lastName,
        String email,
        String phone
) {
}
