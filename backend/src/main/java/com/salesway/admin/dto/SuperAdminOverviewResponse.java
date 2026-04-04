package com.salesway.admin.dto;

public record SuperAdminOverviewResponse(
        long totalCompanies,
        long activeCompanies,
        long totalUsers,
        long activeUsers,
        long totalLeads
) {
}
