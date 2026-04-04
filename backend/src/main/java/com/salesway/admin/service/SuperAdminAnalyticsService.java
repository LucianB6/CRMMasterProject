package com.salesway.admin.service;

import com.salesway.admin.dto.SuperAdminAnalyticsOverviewResponse;
import com.salesway.admin.dto.SuperAdminCompanyActivityResponse;
import com.salesway.admin.dto.SuperAdminTopPageResponse;
import com.salesway.analytics.repository.PageViewEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class SuperAdminAnalyticsService {
    private final PageViewEventRepository pageViewEventRepository;
    private final SuperAdminAccessService superAdminAccessService;

    public SuperAdminAnalyticsService(
            PageViewEventRepository pageViewEventRepository,
            SuperAdminAccessService superAdminAccessService
    ) {
        this.pageViewEventRepository = pageViewEventRepository;
        this.superAdminAccessService = superAdminAccessService;
    }

    @Transactional(readOnly = true)
    public SuperAdminAnalyticsOverviewResponse getOverview() {
        superAdminAccessService.getSuperAdminUser();
        Instant now = Instant.now();
        Instant last7Days = now.minus(7, ChronoUnit.DAYS);
        Instant last30Days = now.minus(30, ChronoUnit.DAYS);
        return new SuperAdminAnalyticsOverviewResponse(
                pageViewEventRepository.countDistinctCompaniesSince(last7Days),
                pageViewEventRepository.countDistinctUsersSince(last7Days),
                pageViewEventRepository.countAllSince(last7Days),
                pageViewEventRepository.countDistinctCompaniesSince(last30Days),
                pageViewEventRepository.countDistinctUsersSince(last30Days),
                pageViewEventRepository.countAllSince(last30Days)
        );
    }

    @Transactional(readOnly = true)
    public List<SuperAdminCompanyActivityResponse> getCompanyActivity() {
        superAdminAccessService.getSuperAdminUser();
        Instant last7Days = Instant.now().minus(7, ChronoUnit.DAYS);
        return pageViewEventRepository.findCompanyActivitySince(last7Days).stream()
                .map(this::toCompanyActivityResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SuperAdminTopPageResponse> getTopPages() {
        superAdminAccessService.getSuperAdminUser();
        Instant last7Days = Instant.now().minus(7, ChronoUnit.DAYS);
        return pageViewEventRepository.findTopPagesSince(last7Days).stream()
                .map(this::toTopPageResponse)
                .toList();
    }

    private SuperAdminCompanyActivityResponse toCompanyActivityResponse(Object[] row) {
        return new SuperAdminCompanyActivityResponse(
                (UUID) row[0],
                (String) row[1],
                ((Number) row[2]).longValue(),
                ((Number) row[3]).longValue(),
                (Instant) row[4]
        );
    }

    private SuperAdminTopPageResponse toTopPageResponse(Object[] row) {
        return new SuperAdminTopPageResponse(
                (String) row[0],
                (String) row[1],
                ((Number) row[2]).longValue(),
                ((Number) row[3]).longValue(),
                ((Number) row[4]).longValue()
        );
    }
}
