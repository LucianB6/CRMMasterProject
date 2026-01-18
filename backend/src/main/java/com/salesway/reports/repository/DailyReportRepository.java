package com.salesway.reports.repository;

import com.salesway.reports.entity.DailyReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface DailyReportRepository extends JpaRepository<DailyReport, UUID> {
    Optional<DailyReport> findByAgentMembershipIdAndReportDate(UUID membershipId, LocalDate reportDate);
}
