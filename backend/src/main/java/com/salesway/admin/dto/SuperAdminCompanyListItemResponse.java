package com.salesway.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record SuperAdminCompanyListItemResponse(
        UUID companyId,
        String name,
        String planCode,
        boolean active,
        Instant createdAt,
        long userCount,
        long leadCount,
        Instant lastActivityAt,
        long managerCount
) {
}
