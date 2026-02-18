package com.salesway.leads.dto;

import java.util.UUID;

public record LeadAnswerResponse(
        UUID questionId,
        String questionLabelSnapshot,
        String questionTypeSnapshot,
        Boolean requiredSnapshot,
        String optionsSnapshot,
        String answerValue
) {
}
