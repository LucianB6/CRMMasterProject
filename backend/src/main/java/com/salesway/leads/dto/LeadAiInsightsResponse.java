package com.salesway.leads.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LeadAiInsightsResponse(
        UUID insightId,
        int score,
        String relationshipSentiment,
        String relationshipRiskLevel,
        String relationshipTrend,
        String relationshipKeyBlocker,
        double confidenceScore,
        String confidenceLevel,
        String guidanceSource,
        LeadAiNextBestActionResponse nextBestAction,
        LeadAiWhatChangedResponse whatChanged,
        LeadAiExplainabilityResponse explainability,
        String recommendedAction,
        String suggestedApproach,
        List<LeadAiInsightFactorResponse> scoreFactors,
        Instant generatedAt
) {
}
