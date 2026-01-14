package com.salesway.reports.entity;

import com.salesway.common.auditing.CreatedOnlyEntity;
import com.salesway.common.enums.DailyReportAuditAction;
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
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "daily_report_audit_log",
        indexes = {
                @Index(name = "idx_audit_report_created", columnList = "daily_report_id, created_at")
        })
public class DailyReportAuditLog extends CreatedOnlyEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_report_id", nullable = false)
    private DailyReport dailyReport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_membership_id")
    private CompanyMembership actorMembership;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    private DailyReportAuditAction action;

    @Column(name = "before_snapshot_json", columnDefinition = "text")
    private String beforeSnapshotJsonText;

    @Column(name = "after_snapshot_json", columnDefinition = "text")
    private String afterSnapshotJsonText;

    @Size(max = 255)
    @Column(name = "reason")
    private String reason;

    public DailyReport getDailyReport() {
        return dailyReport;
    }

    public void setDailyReport(DailyReport dailyReport) {
        this.dailyReport = dailyReport;
    }

    public CompanyMembership getActorMembership() {
        return actorMembership;
    }

    public void setActorMembership(CompanyMembership actorMembership) {
        this.actorMembership = actorMembership;
    }

    public DailyReportAuditAction getAction() {
        return action;
    }

    public void setAction(DailyReportAuditAction action) {
        this.action = action;
    }

    public String getBeforeSnapshotJsonText() {
        return beforeSnapshotJsonText;
    }

    public void setBeforeSnapshotJsonText(String beforeSnapshotJsonText) {
        this.beforeSnapshotJsonText = beforeSnapshotJsonText;
    }

    public String getAfterSnapshotJsonText() {
        return afterSnapshotJsonText;
    }

    public void setAfterSnapshotJsonText(String afterSnapshotJsonText) {
        this.afterSnapshotJsonText = afterSnapshotJsonText;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
