package com.salesway.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.salesway.common.enums.DailyReportStatus;
import com.salesway.reports.dto.DailyReportInputsRequest;
import jakarta.validation.constraints.NotNull;

public class ManagerDailyReportUpdateRequest extends DailyReportInputsRequest {
    @NotNull
    @JsonProperty("status")
    private DailyReportStatus status;

    public DailyReportStatus getStatus() {
        return status;
    }

    public void setStatus(DailyReportStatus status) {
        this.status = status;
    }
}
