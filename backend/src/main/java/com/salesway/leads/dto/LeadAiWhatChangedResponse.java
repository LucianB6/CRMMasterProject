package com.salesway.leads.dto;

import java.util.List;

public record LeadAiWhatChangedResponse(
        String previousRecommendation,
        String previousFeedbackStatus,
        List<String> changes
) {
}
