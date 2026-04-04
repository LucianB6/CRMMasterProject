package com.salesway.billing.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

@Entity
@Table(
        name = "company_usage_balances",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_company_usage_balances_company_usage_period",
                columnNames = {"company_id", "usage_type", "period_start"}
        )
)
public class CompanyUsageBalance extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "usage_type", nullable = false, length = 64)
    private UsageType usageType;

    @NotNull
    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @NotNull
    @Column(name = "used_units", nullable = false)
    private Integer usedUnits = 0;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public UsageType getUsageType() {
        return usageType;
    }

    public void setUsageType(UsageType usageType) {
        this.usageType = usageType;
    }

    public LocalDate getPeriodStart() {
        return periodStart;
    }

    public void setPeriodStart(LocalDate periodStart) {
        this.periodStart = periodStart;
    }

    public Integer getUsedUnits() {
        return usedUnits;
    }

    public void setUsedUnits(Integer usedUnits) {
        this.usedUnits = usedUnits;
    }
}
