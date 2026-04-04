package com.salesway.billing.repository;

import com.salesway.billing.entity.CompanyUsageBalance;
import com.salesway.billing.entity.UsageType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyUsageBalanceRepository extends JpaRepository<CompanyUsageBalance, UUID> {
    Optional<CompanyUsageBalance> findByCompanyIdAndUsageTypeAndPeriodStart(UUID companyId, UsageType usageType, LocalDate periodStart);

    List<CompanyUsageBalance> findByCompanyIdAndPeriodStart(UUID companyId, LocalDate periodStart);
}
