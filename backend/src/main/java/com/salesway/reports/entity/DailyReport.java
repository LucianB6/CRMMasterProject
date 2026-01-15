package com.salesway.reports.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.common.enums.DailyReportStatus;
import com.salesway.companies.entity.Company;
import com.salesway.memberships.entity.CompanyMembership;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "daily_reports",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_reports_agent_date", columnNames = {"agent_membership_id", "report_date"})
        },
        indexes = {
                @Index(name = "idx_reports_company_date", columnList = "company_id, report_date"),
                @Index(name = "idx_reports_agent_date", columnList = "agent_membership_id, report_date")
        })
public class DailyReport extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_membership_id", nullable = false)
    private CompanyMembership agentMembership;

    @NotNull
    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DailyReportStatus status;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitted_by_membership_id")
    private CompanyMembership submittedByMembership;

    @Column(name = "locked_at")
    private Instant lockedAt;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public CompanyMembership getAgentMembership() {
        return agentMembership;
    }

    public void setAgentMembership(CompanyMembership agentMembership) {
        this.agentMembership = agentMembership;
    }

    public LocalDate getReportDate() {
        return reportDate;
    }

    public void setReportDate(LocalDate reportDate) {
        this.reportDate = reportDate;
    }

    public DailyReportStatus getStatus() {
        return status;
    }

    public void setStatus(DailyReportStatus status) {
        this.status = status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public CompanyMembership getSubmittedByMembership() {
        return submittedByMembership;
    }

    public void setSubmittedByMembership(CompanyMembership submittedByMembership) {
        this.submittedByMembership = submittedByMembership;
    }

    public Instant getLockedAt() {
        return lockedAt;
    }

    public void setLockedAt(Instant lockedAt) {
        this.lockedAt = lockedAt;
    }
}
