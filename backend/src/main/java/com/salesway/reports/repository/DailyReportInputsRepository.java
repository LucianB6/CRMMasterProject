package com.salesway.reports.repository;

import com.salesway.reports.entity.DailyReportInputs;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DailyReportInputsRepository extends JpaRepository<DailyReportInputs, UUID> {
}
