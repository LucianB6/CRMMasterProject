package com.salesway.leads.dto;

import java.time.Instant;
import java.util.UUID;

public record PublicLeadSubmitResponse(UUID leadId, Instant submittedAt, String status) {
}
