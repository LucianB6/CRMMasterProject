package com.salesway.leads.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record LeadDetailResponse(
        UUID leadId,
        String status,
        Instant submittedAt,
        String firstName,
        String lastName,
        String email,
        String phone,
        List<LeadAnswerResponse> answers
) {
}
