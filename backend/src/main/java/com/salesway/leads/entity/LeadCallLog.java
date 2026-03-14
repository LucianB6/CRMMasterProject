package com.salesway.leads.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lead_call_logs", indexes = {
        @Index(name = "idx_lead_call_logs_company_lead_created", columnList = "company_id,lead_id,created_at"),
        @Index(name = "idx_lead_call_logs_lead_created", columnList = "lead_id,created_at")
})
public class LeadCallLog extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @NotBlank
    @Size(max = 255)
    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Size(max = 64)
    @Column(name = "outcome")
    private String outcome;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "call_time")
    private Instant callTime;

    public Lead getLead() {
        return lead;
    }

    public void setLead(Lead lead) {
        this.lead = lead;
    }

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public UUID getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(UUID actorUserId) {
        this.actorUserId = actorUserId;
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

    public String getOutcome() {
        return outcome;
    }

    public void setOutcome(String outcome) {
        this.outcome = outcome;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Instant getCallTime() {
        return callTime;
    }

    public void setCallTime(Instant callTime) {
        this.callTime = callTime;
    }
}
