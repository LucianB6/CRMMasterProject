package com.salesway.leads.dto;

import java.time.Instant;
import java.util.UUID;

public record LeadDetailAnswerItemResponse(
        UUID questionId,
        String questionLabel,
        String questionType,
        String answer,
        Instant answeredAt
) {
}
