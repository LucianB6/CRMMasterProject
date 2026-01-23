package com.salesway.reports.repository;

import com.salesway.reports.entity.DailyReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DailyReportRepository extends JpaRepository<DailyReport, UUID> {
    Optional<DailyReport> findByAgentMembershipIdAndReportDate(UUID membershipId, LocalDate reportDate);

    List<DailyReport> findByAgentMembershipId(UUID membershipId);

    List<DailyReport> findByAgentMembershipIdAndReportDateBetweenOrderByReportDateAsc(
            UUID membershipId,
            LocalDate from,
            LocalDate to
    );

    List<DailyReport> findByCompanyIdAndReportDateBetweenOrderByReportDateAsc(
            UUID companyId,
            LocalDate from,
            LocalDate to
    );

    List<DailyReport> findByCompanyIdAndAgentMembershipIdAndReportDateBetweenOrderByReportDateAsc(
            UUID companyId,
            UUID agentMembershipId,
            LocalDate from,
            LocalDate to
    );

    List<DailyReport> findByAgentMembershipManagerMembershipIdAndReportDateBetweenOrderByReportDateAsc(
            UUID managerMembershipId,
            LocalDate from,
            LocalDate to
    );

    List<DailyReport> findByAgentMembershipManagerMembershipIdAndAgentMembershipIdAndReportDateBetweenOrderByReportDateAsc(
            UUID managerMembershipId,
            UUID agentMembershipId,
            LocalDate from,
            LocalDate to
    );

    void deleteByAgentMembershipId(UUID membershipId);
}
