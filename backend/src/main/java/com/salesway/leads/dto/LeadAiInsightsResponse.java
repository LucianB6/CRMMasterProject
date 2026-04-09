package com.salesway.leads.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LeadAiInsightsResponse(
        UUID insightId,
        int score,
        int clientScore,
        int nextCallCloseProbability,
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
        Instant generatedAt,
        String regenerationStatus,
        String regenerationError
) {
    @JsonProperty("status")
    public String status() {
        return regenerationStatus;
    }

    @JsonProperty("error")
    public String error() {
        return regenerationError;
    }
}
