package com.salesway.admin.dto;

import java.util.UUID;

public record SuperAdminCompanyCreateResponse(
        UUID companyId,
        UUID managerUserId,
        String managerEmail,
        boolean usedExistingUser
) {
}
