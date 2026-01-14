package com.salesway.tasks.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.common.enums.TaskPeriod;
import com.salesway.common.enums.TaskStatus;
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
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "tasks",
        indexes = {
                @Index(name = "idx_tasks_company", columnList = "company_id"),
                @Index(name = "idx_tasks_assignee", columnList = "assigned_to_membership_id, status")
        })
public class Task extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_membership_id", nullable = false)
    private CompanyMembership createdByMembership;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_membership_id")
    private CompanyMembership assignedToMembership;

    @NotBlank
    @Size(max = 255)
    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "period", nullable = false)
    private TaskPeriod period;

    @NotBlank
    @Size(max = 255)
    @Column(name = "metric_key", nullable = false)
    private String metricKey;

    @NotNull
    @DecimalMin("0")
    @Column(name = "target_value", nullable = false, precision = 19, scale = 2)
    private BigDecimal targetValue;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TaskStatus status = TaskStatus.ACTIVE;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public CompanyMembership getCreatedByMembership() {
        return createdByMembership;
    }

    public void setCreatedByMembership(CompanyMembership createdByMembership) {
        this.createdByMembership = createdByMembership;
    }

    public CompanyMembership getAssignedToMembership() {
        return assignedToMembership;
    }

    public void setAssignedToMembership(CompanyMembership assignedToMembership) {
        this.assignedToMembership = assignedToMembership;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TaskPeriod getPeriod() {
        return period;
    }

    public void setPeriod(TaskPeriod period) {
        this.period = period;
    }

    public String getMetricKey() {
        return metricKey;
    }

    public void setMetricKey(String metricKey) {
        this.metricKey = metricKey;
    }

    public BigDecimal getTargetValue() {
        return targetValue;
    }

    public void setTargetValue(BigDecimal targetValue) {
        this.targetValue = targetValue;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }
}
