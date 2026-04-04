package com.salesway.admin.dto;

import java.util.UUID;

public record SuperAdminCompanyStatusUpdateResponse(
        UUID companyId,
        boolean active
) {
}
