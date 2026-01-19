package com.salesway.reports.repository;

import com.salesway.reports.entity.DailyReportInputs;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DailyReportInputsRepository extends JpaRepository<DailyReportInputs, UUID> {
    Optional<DailyReportInputs> findByDailyReportId(UUID dailyReportId);

    List<DailyReportInputs> findByDailyReportIdIn(Collection<UUID> dailyReportIds);
}
