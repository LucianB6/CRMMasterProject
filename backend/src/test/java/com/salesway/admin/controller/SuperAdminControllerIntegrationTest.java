package com.salesway.admin.controller;

import com.salesway.admin.dto.SuperAdminAnalyticsOverviewResponse;
import com.salesway.admin.dto.SuperAdminCompanyListItemResponse;
import com.salesway.admin.dto.SuperAdminCompanyCreateResponse;
import com.salesway.admin.dto.SuperAdminCompanyActivityResponse;
import com.salesway.admin.dto.SuperAdminOverviewResponse;
import com.salesway.admin.dto.SuperAdminCompanyStatusUpdateResponse;
import com.salesway.admin.dto.SuperAdminTopPageResponse;
import com.salesway.admin.dto.SuperAdminUserListItemResponse;
import com.salesway.admin.service.SuperAdminAnalyticsService;
import com.salesway.admin.service.SuperAdminCompanyService;
import com.salesway.admin.service.SuperAdminOverviewService;
import com.salesway.admin.service.SuperAdminUserService;
import com.salesway.common.error.ApiExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.http.MediaType;

class SuperAdminControllerIntegrationTest {

    private MockMvc mockMvc;
    private SuperAdminOverviewService superAdminOverviewService;
    private SuperAdminAnalyticsService superAdminAnalyticsService;
    private SuperAdminCompanyService superAdminCompanyService;
    private SuperAdminUserService superAdminUserService;

    @BeforeEach
    void setUp() {
        superAdminOverviewService = mock(SuperAdminOverviewService.class);
        superAdminAnalyticsService = mock(SuperAdminAnalyticsService.class);
        superAdminCompanyService = mock(SuperAdminCompanyService.class);
        superAdminUserService = mock(SuperAdminUserService.class);
        SuperAdminController controller = new SuperAdminController(
                superAdminOverviewService,
                superAdminAnalyticsService,
                superAdminCompanyService,
                superAdminUserService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void getOverview_returnsAggregatedPlatformMetrics() throws Exception {
        when(superAdminOverviewService.getOverview()).thenReturn(new SuperAdminOverviewResponse(
                12,
                10,
                48,
                41,
                326
        ));

        mockMvc.perform(get("/admin/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCompanies").value(12))
                .andExpect(jsonPath("$.activeCompanies").value(10))
                .andExpect(jsonPath("$.totalUsers").value(48))
                .andExpect(jsonPath("$.activeUsers").value(41))
                .andExpect(jsonPath("$.totalLeads").value(326));
    }

    @Test
    void getCompanies_returnsPlatformCompanyList() throws Exception {
        UUID companyId = UUID.randomUUID();
        when(superAdminCompanyService.listCompanies()).thenReturn(List.of(
                new SuperAdminCompanyListItemResponse(
                        companyId,
                        "SalesWay",
                        "STARTER",
                        true,
                        Instant.parse("2026-03-19T12:00:00Z"),
                        7,
                        91,
                        Instant.parse("2026-03-19T13:15:00Z"),
                        2
                )
        ));

        mockMvc.perform(get("/admin/companies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].companyId").value(companyId.toString()))
                .andExpect(jsonPath("$[0].name").value("SalesWay"))
                .andExpect(jsonPath("$[0].planCode").value("STARTER"))
                .andExpect(jsonPath("$[0].active").value(true))
                .andExpect(jsonPath("$[0].userCount").value(7))
                .andExpect(jsonPath("$[0].leadCount").value(91))
                .andExpect(jsonPath("$[0].managerCount").value(2));
    }

    @Test
    void getAnalyticsOverview_returnsActivityMetrics() throws Exception {
        when(superAdminAnalyticsService.getOverview()).thenReturn(new SuperAdminAnalyticsOverviewResponse(
                8,
                24,
                410,
                12,
                39,
                1260
        ));

        mockMvc.perform(get("/admin/analytics/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCompaniesLast7Days").value(8))
                .andExpect(jsonPath("$.activeUsersLast7Days").value(24))
                .andExpect(jsonPath("$.pageViewsLast7Days").value(410))
                .andExpect(jsonPath("$.activeCompaniesLast30Days").value(12))
                .andExpect(jsonPath("$.activeUsersLast30Days").value(39))
                .andExpect(jsonPath("$.pageViewsLast30Days").value(1260));
    }

    @Test
    void getAnalyticsCompanies_returnsCompanyActivityRanking() throws Exception {
        UUID companyId = UUID.randomUUID();
        when(superAdminAnalyticsService.getCompanyActivity()).thenReturn(List.of(
                new SuperAdminCompanyActivityResponse(
                        companyId,
                        "SalesWay",
                        245,
                        9,
                        Instant.parse("2026-03-19T14:00:00Z")
                )
        ));

        mockMvc.perform(get("/admin/analytics/companies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].companyId").value(companyId.toString()))
                .andExpect(jsonPath("$[0].companyName").value("SalesWay"))
                .andExpect(jsonPath("$[0].pageViewsLast7Days").value(245))
                .andExpect(jsonPath("$[0].activeUsersLast7Days").value(9));
    }

    @Test
    void getAnalyticsTopPages_returnsGlobalPageRanking() throws Exception {
        when(superAdminAnalyticsService.getTopPages()).thenReturn(List.of(
                new SuperAdminTopPageResponse(
                        "/dashboard/leads",
                        "Lead Dashboard",
                        182,
                        7,
                        19
                )
        ));

        mockMvc.perform(get("/admin/analytics/top-pages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].path").value("/dashboard/leads"))
                .andExpect(jsonPath("$[0].routeName").value("Lead Dashboard"))
                .andExpect(jsonPath("$[0].viewsLast7Days").value(182))
                .andExpect(jsonPath("$[0].uniqueCompaniesLast7Days").value(7))
                .andExpect(jsonPath("$[0].uniqueUsersLast7Days").value(19));
    }

    @Test
    void getUsers_returnsPlatformUserList() throws Exception {
        UUID userId = UUID.randomUUID();
        when(superAdminUserService.listUsers()).thenReturn(List.of(
                new SuperAdminUserListItemResponse(
                        userId,
                        "owner@salesway.com",
                        "Ana",
                        "Popescu",
                        "SUPER_ADMIN",
                        true,
                        Instant.parse("2026-03-19T09:30:00Z"),
                        List.of("SalesWay"),
                        List.of("manager")
                )
        ));

        mockMvc.perform(get("/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].userId").value(userId.toString()))
                .andExpect(jsonPath("$[0].email").value("owner@salesway.com"))
                .andExpect(jsonPath("$[0].platformRole").value("SUPER_ADMIN"))
                .andExpect(jsonPath("$[0].active").value(true))
                .andExpect(jsonPath("$[0].companies[0]").value("SalesWay"))
                .andExpect(jsonPath("$[0].companyRoles[0]").value("manager"));
    }

    @Test
    void createCompany_returnsCreatedManagerWorkspacePayload() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID managerUserId = UUID.randomUUID();
        when(superAdminCompanyService.createCompany(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new SuperAdminCompanyCreateResponse(
                        companyId,
                        managerUserId,
                        "manager@salesway.com",
                        false
                ));

        String body = """
                {
                  "companyName": "SalesWay",
                  "planCode": "STARTER",
                  "timezone": "Europe/Bucharest",
                  "managerEmail": "manager@salesway.com",
                  "managerFirstName": "Ana",
                  "managerLastName": "Popescu",
                  "temporaryPassword": "Secret123"
                }
                """;

        mockMvc.perform(post("/admin/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyId").value(companyId.toString()))
                .andExpect(jsonPath("$.managerUserId").value(managerUserId.toString()))
                .andExpect(jsonPath("$.managerEmail").value("manager@salesway.com"))
                .andExpect(jsonPath("$.usedExistingUser").value(false));
    }

    @Test
    void updateCompanyStatus_returnsPatchedState() throws Exception {
        UUID companyId = UUID.randomUUID();
        when(superAdminCompanyService.updateCompanyStatus(companyId, false))
                .thenReturn(new SuperAdminCompanyStatusUpdateResponse(companyId, false));

        mockMvc.perform(patch("/admin/companies/{companyId}/status", companyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "active": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyId").value(companyId.toString()))
                .andExpect(jsonPath("$.active").value(false));
    }
}
