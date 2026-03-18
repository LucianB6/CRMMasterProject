package com.salesway.leads.dto;

import java.util.List;
import java.util.UUID;

public record LeadFormResponse(
        UUID id,
        String title,
        String publicSlug,
        Boolean isActive,
        List<LeadQuestionResponse> questions
) {
}
