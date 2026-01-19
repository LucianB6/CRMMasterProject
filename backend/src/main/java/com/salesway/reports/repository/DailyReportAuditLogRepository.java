package com.salesway.reports.repository;

import com.salesway.reports.entity.DailyReportAuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DailyReportAuditLogRepository extends JpaRepository<DailyReportAuditLog, UUID> {
    List<DailyReportAuditLog> findByDailyReportCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);
}
