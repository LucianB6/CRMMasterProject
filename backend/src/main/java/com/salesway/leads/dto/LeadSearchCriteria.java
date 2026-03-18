package com.salesway.leads.dto;

import java.time.Instant;
import java.util.UUID;

public record LeadSearchCriteria(
        String status,
        String q,
        Instant createdFrom,
        Instant createdTo,
        UUID assignedToUserId,
        Boolean hasOpenTasks,
        String source,
        UUID visibleToUserId,
        boolean includeUnassignedForVisibleUser
) {
}
