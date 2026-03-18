package com.salesway.leads.dto;

import java.util.UUID;

public record LeadQuestionResponse(
        UUID id,
        String questionType,
        String label,
        String placeholder,
        String helpText,
        Boolean required,
        String optionsJson,
        Integer displayOrder,
        Boolean isActive
) {
}
