package com.salesway.admin.dto;

public record SuperAdminAnalyticsOverviewResponse(
        long activeCompaniesLast7Days,
        long activeUsersLast7Days,
        long pageViewsLast7Days,
        long activeCompaniesLast30Days,
        long activeUsersLast30Days,
        long pageViewsLast30Days
) {
}
