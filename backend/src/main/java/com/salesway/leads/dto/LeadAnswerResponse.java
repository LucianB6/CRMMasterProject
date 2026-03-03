package com.salesway.leads.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

public record LeadAnswerResponse(
        UUID questionId,
        String questionLabelSnapshot,
        String questionTypeSnapshot,
        Boolean requiredSnapshot,
        String optionsSnapshotJson,
        String answerValueJson,
        JsonNode optionsSnapshot,
        JsonNode answerValue
) {
}
