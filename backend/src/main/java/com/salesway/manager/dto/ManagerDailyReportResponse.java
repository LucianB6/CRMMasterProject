package com.salesway.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.salesway.common.enums.DailyReportStatus;
import com.salesway.reports.dto.DailyReportInputsResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class ManagerDailyReportResponse {
    @JsonProperty("id")
    private final UUID id;

    @JsonProperty("report_date")
    private final LocalDate reportDate;

    @JsonProperty("status")
    private final DailyReportStatus status;

    @JsonProperty("submitted_at")
    private final Instant submittedAt;

    @JsonProperty("agent_membership_id")
    private final UUID agentMembershipId;

    @JsonProperty("agent_email")
    private final String agentEmail;

    @JsonProperty("inputs")
    private final DailyReportInputsResponse inputs;

    public ManagerDailyReportResponse(
            UUID id,
            LocalDate reportDate,
            DailyReportStatus status,
            Instant submittedAt,
            UUID agentMembershipId,
            String agentEmail,
            DailyReportInputsResponse inputs
    ) {
        this.id = id;
        this.reportDate = reportDate;
        this.status = status;
        this.submittedAt = submittedAt;
        this.agentMembershipId = agentMembershipId;
        this.agentEmail = agentEmail;
        this.inputs = inputs;
    }

    public UUID getId() {
        return id;
    }

    public LocalDate getReportDate() {
        return reportDate;
    }

    public DailyReportStatus getStatus() {
        return status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public UUID getAgentMembershipId() {
        return agentMembershipId;
    }

    public String getAgentEmail() {
        return agentEmail;
    }

    public DailyReportInputsResponse getInputs() {
        return inputs;
    }
}
