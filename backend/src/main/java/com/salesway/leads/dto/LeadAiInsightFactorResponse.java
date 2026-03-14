package com.salesway.leads.dto;

public record LeadAiInsightFactorResponse(
        String label,
        int value,
        String type,
        String detail
) {
}
