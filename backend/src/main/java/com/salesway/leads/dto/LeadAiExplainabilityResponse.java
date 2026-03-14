package com.salesway.leads.dto;

import java.util.List;

public record LeadAiExplainabilityResponse(
        String whyThisInsight,
        List<String> basedOnSignals,
        List<String> kbEvidence
) {
}
