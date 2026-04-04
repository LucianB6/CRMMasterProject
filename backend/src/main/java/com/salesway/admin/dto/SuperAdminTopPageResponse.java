package com.salesway.admin.dto;

public record SuperAdminTopPageResponse(
        String path,
        String routeName,
        long viewsLast7Days,
        long uniqueCompaniesLast7Days,
        long uniqueUsersLast7Days
) {
}
