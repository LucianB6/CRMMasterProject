package com.salesway.leads.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LeadDetailResponse(
        UUID leadId,
        String status,
        Instant submittedAt,
        Instant lastActivityAt,
        String firstName,
        String lastName,
        String email,
        String phone,
        UUID assignedToUserId,
        Instant assignedAt,
        UUID assignedByUserId,
        String source,
        String campaign,
        String adSet,
        String adId,
        String utmSource,
        String utmCampaign,
        String utmMedium,
        String utmContent,
        String landingPage,
        String referrer,
        boolean isDuplicate,
        UUID duplicateGroupId,
        UUID duplicateOfLeadId,
        UUID stageId,
        List<UUID> relatedLeadIds,
        List<LeadAnswerResponse> answers
) {
}
