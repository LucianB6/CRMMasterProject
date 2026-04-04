package com.salesway.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record SuperAdminCompanyActivityResponse(
        UUID companyId,
        String companyName,
        long pageViewsLast7Days,
        long activeUsersLast7Days,
        Instant lastActivityAt
) {
}
