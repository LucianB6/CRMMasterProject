package com.salesway.leads.dto;

public record LeadAiNextBestActionResponse(
        String actionType,
        String priority,
        String reason,
        String whyNow,
        String deadlineHint
) {
}
