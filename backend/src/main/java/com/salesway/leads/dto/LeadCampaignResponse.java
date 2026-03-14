package com.salesway.leads.dto;

import com.salesway.leads.enums.CampaignChannel;

import java.time.Instant;
import java.util.UUID;

public record LeadCampaignResponse(
        UUID id,
        UUID formId,
        String name,
        CampaignChannel channel,
        String campaignCode,
        String utmSource,
        String utmMedium,
        Boolean isActive,
        String publicLink,
        Instant createdAt,
        Instant updatedAt
) {
}
