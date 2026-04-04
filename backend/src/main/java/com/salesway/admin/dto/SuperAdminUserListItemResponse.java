package com.salesway.admin.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SuperAdminUserListItemResponse(
        UUID userId,
        String email,
        String firstName,
        String lastName,
        String platformRole,
        boolean active,
        Instant lastLoginAt,
        List<String> companies,
        List<String> companyRoles
) {
}
