package com.salesway.reports.repository;

import com.salesway.reports.entity.DailyReportMetrics;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DailyReportMetricsRepository extends JpaRepository<DailyReportMetrics, UUID> {
}
