package com.salesway.admin.controller;

import com.salesway.admin.dto.SuperAdminCompanyCreateRequest;
import com.salesway.admin.dto.SuperAdminCompanyCreateResponse;
import com.salesway.admin.dto.SuperAdminCompanyActivityResponse;
import com.salesway.admin.dto.SuperAdminCompanyListItemResponse;
import com.salesway.admin.dto.SuperAdminCompanyStatusUpdateRequest;
import com.salesway.admin.dto.SuperAdminCompanyStatusUpdateResponse;
import com.salesway.admin.dto.SuperAdminAnalyticsOverviewResponse;
import com.salesway.admin.dto.SuperAdminOverviewResponse;
import com.salesway.admin.dto.SuperAdminTopPageResponse;
import com.salesway.admin.dto.SuperAdminUserListItemResponse;
import com.salesway.admin.service.SuperAdminAnalyticsService;
import com.salesway.admin.service.SuperAdminCompanyService;
import com.salesway.admin.service.SuperAdminOverviewService;
import com.salesway.admin.service.SuperAdminUserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
public class SuperAdminController {
    private final SuperAdminOverviewService superAdminOverviewService;
    private final SuperAdminAnalyticsService superAdminAnalyticsService;
    private final SuperAdminCompanyService superAdminCompanyService;
    private final SuperAdminUserService superAdminUserService;

    public SuperAdminController(
            SuperAdminOverviewService superAdminOverviewService,
            SuperAdminAnalyticsService superAdminAnalyticsService,
            SuperAdminCompanyService superAdminCompanyService,
            SuperAdminUserService superAdminUserService
    ) {
        this.superAdminOverviewService = superAdminOverviewService;
        this.superAdminAnalyticsService = superAdminAnalyticsService;
        this.superAdminCompanyService = superAdminCompanyService;
        this.superAdminUserService = superAdminUserService;
    }

    @GetMapping("/overview")
    public ResponseEntity<SuperAdminOverviewResponse> getOverview() {
        return ResponseEntity.ok(superAdminOverviewService.getOverview());
    }

    @GetMapping("/analytics/overview")
    public ResponseEntity<SuperAdminAnalyticsOverviewResponse> getAnalyticsOverview() {
        return ResponseEntity.ok(superAdminAnalyticsService.getOverview());
    }

    @GetMapping("/analytics/companies")
    public ResponseEntity<List<SuperAdminCompanyActivityResponse>> getCompanyActivity() {
        return ResponseEntity.ok(superAdminAnalyticsService.getCompanyActivity());
    }

    @GetMapping("/analytics/top-pages")
    public ResponseEntity<List<SuperAdminTopPageResponse>> getTopPages() {
        return ResponseEntity.ok(superAdminAnalyticsService.getTopPages());
    }

    @GetMapping("/companies")
    public ResponseEntity<List<SuperAdminCompanyListItemResponse>> getCompanies() {
        return ResponseEntity.ok(superAdminCompanyService.listCompanies());
    }

    @PostMapping("/companies")
    public ResponseEntity<SuperAdminCompanyCreateResponse> createCompany(
            @Valid @RequestBody SuperAdminCompanyCreateRequest request
    ) {
        return ResponseEntity.ok(superAdminCompanyService.createCompany(request));
    }

    @PatchMapping("/companies/{companyId}/status")
    public ResponseEntity<SuperAdminCompanyStatusUpdateResponse> updateCompanyStatus(
            @PathVariable UUID companyId,
            @Valid @RequestBody SuperAdminCompanyStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(superAdminCompanyService.updateCompanyStatus(companyId, request.getActive()));
    }

    @GetMapping("/users")
    public ResponseEntity<List<SuperAdminUserListItemResponse>> getUsers() {
        return ResponseEntity.ok(superAdminUserService.listUsers());
    }
}
