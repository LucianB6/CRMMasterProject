package com.salesway.leads.dto;

import java.util.UUID;

public record LeadScoringEnqueueResponse(
        String status,
        UUID leadId
) {
}
