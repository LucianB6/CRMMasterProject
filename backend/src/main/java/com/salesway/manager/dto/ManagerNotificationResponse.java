package com.salesway.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.salesway.common.enums.DailyReportAuditAction;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class ManagerNotificationResponse {
    @JsonProperty("id")
    private final UUID id;

    @JsonProperty("action")
    private final DailyReportAuditAction action;

    @JsonProperty("created_at")
    private final Instant createdAt;

    @JsonProperty("report_id")
    private final UUID reportId;

    @JsonProperty("report_date")
    private final LocalDate reportDate;

    @JsonProperty("agent_membership_id")
    private final UUID agentMembershipId;

    @JsonProperty("agent_email")
    private final String agentEmail;

    @JsonProperty("actor_membership_id")
    private final UUID actorMembershipId;

    @JsonProperty("actor_email")
    private final String actorEmail;

    public ManagerNotificationResponse(
            UUID id,
            DailyReportAuditAction action,
            Instant createdAt,
            UUID reportId,
            LocalDate reportDate,
            UUID agentMembershipId,
            String agentEmail,
            UUID actorMembershipId,
            String actorEmail
    ) {
        this.id = id;
        this.action = action;
        this.createdAt = createdAt;
        this.reportId = reportId;
        this.reportDate = reportDate;
        this.agentMembershipId = agentMembershipId;
        this.agentEmail = agentEmail;
        this.actorMembershipId = actorMembershipId;
        this.actorEmail = actorEmail;
    }

    public UUID getId() {
        return id;
    }

    public DailyReportAuditAction getAction() {
        return action;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public UUID getReportId() {
        return reportId;
    }

    public LocalDate getReportDate() {
        return reportDate;
    }

    public UUID getAgentMembershipId() {
        return agentMembershipId;
    }

    public String getAgentEmail() {
        return agentEmail;
    }

    public UUID getActorMembershipId() {
        return actorMembershipId;
    }

    public String getActorEmail() {
        return actorEmail;
    }
}
