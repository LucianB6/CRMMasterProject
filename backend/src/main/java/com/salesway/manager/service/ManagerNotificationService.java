package com.salesway.manager.service;

import com.salesway.manager.dto.ManagerNotificationResponse;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.reports.entity.DailyReportAuditLog;
import com.salesway.reports.repository.DailyReportAuditLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ManagerNotificationService {
    private final ManagerAccessService managerAccessService;
    private final DailyReportAuditLogRepository dailyReportAuditLogRepository;

    public ManagerNotificationService(
            ManagerAccessService managerAccessService,
            DailyReportAuditLogRepository dailyReportAuditLogRepository
    ) {
        this.managerAccessService = managerAccessService;
        this.dailyReportAuditLogRepository = dailyReportAuditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<ManagerNotificationResponse> getRecentNotifications(int limit) {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        List<DailyReportAuditLog> logs = dailyReportAuditLogRepository
                .findByDailyReportCompanyIdOrderByCreatedAtDesc(
                        manager.getCompany().getId(),
                        PageRequest.of(0, limit)
                );

        return logs.stream()
                .map(log -> {
                    UUID actorMembershipId = log.getActorMembership() != null ? log.getActorMembership().getId() : null;
                    String actorEmail = log.getActorMembership() != null
                            ? log.getActorMembership().getUser().getEmail()
                            : null;
                    return new ManagerNotificationResponse(
                            log.getId(),
                            log.getAction(),
                            log.getCreatedAt(),
                            log.getDailyReport().getId(),
                            log.getDailyReport().getReportDate(),
                            log.getDailyReport().getAgentMembership().getId(),
                            log.getDailyReport().getAgentMembership().getUser().getEmail(),
                            actorMembershipId,
                            actorEmail
                    );
                })
                .toList();
    }
}
