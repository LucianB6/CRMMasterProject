package com.salesway.tasks.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.reports.entity.DailyReport;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "task_progress",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_task_progress_task_date", columnNames = {"task_id", "date"})
        },
        indexes = {
                @Index(name = "idx_task_progress_task", columnList = "task_id, date")
        })
public class TaskProgress extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @NotNull
    @Column(name = "date", nullable = false)
    private LocalDate date;

    @NotNull
    @DecimalMin("0")
    @Column(name = "value", nullable = false, precision = 19, scale = 2)
    private BigDecimal value = BigDecimal.ZERO;

    @NotNull
    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "computed_from_report_id")
    private DailyReport computedFromReport;

    public Task getTask() {
        return task;
    }

    public void setTask(Task task) {
        this.task = task;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public BigDecimal getValue() {
        return value;
    }

    public void setValue(BigDecimal value) {
        this.value = value;
    }

    public Boolean getIsCompleted() {
        return isCompleted;
    }

    public void setIsCompleted(Boolean isCompleted) {
        this.isCompleted = isCompleted;
    }

    public DailyReport getComputedFromReport() {
        return computedFromReport;
    }

    public void setComputedFromReport(DailyReport computedFromReport) {
        this.computedFromReport = computedFromReport;
    }
}
