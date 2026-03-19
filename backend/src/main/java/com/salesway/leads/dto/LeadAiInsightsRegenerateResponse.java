package com.salesway.leads.dto;

import java.util.UUID;

public record LeadAiInsightsRegenerateResponse(
        String status,
        UUID leadId
) {
}
