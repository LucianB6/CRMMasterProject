package com.salesway.reports.dto;

import com.salesway.common.enums.DailyReportStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class DailyReportResponse {
    private final UUID id;
    private final LocalDate reportDate;
    private final DailyReportStatus status;
    private final Instant submittedAt;
    private final DailyReportInputsResponse inputs;

    public DailyReportResponse(
            UUID id,
            LocalDate reportDate,
            DailyReportStatus status,
            Instant submittedAt,
            DailyReportInputsResponse inputs
    ) {
        this.id = id;
        this.reportDate = reportDate;
        this.status = status;
        this.submittedAt = submittedAt;
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

    public DailyReportInputsResponse getInputs() {
        return inputs;
    }
}
