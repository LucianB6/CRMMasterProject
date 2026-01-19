package com.salesway.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;

public class ManagerTeamPerformancePointResponse {
    @JsonProperty("report_date")
    private final LocalDate reportDate;

    @JsonProperty("outbound_dials")
    private final Integer outboundDials;

    @JsonProperty("total_sales")
    private final Integer totalSales;

    @JsonProperty("new_cash_collected")
    private final java.math.BigDecimal newCashCollected;

    public ManagerTeamPerformancePointResponse(
            LocalDate reportDate,
            Integer outboundDials,
            Integer totalSales,
            java.math.BigDecimal newCashCollected
    ) {
        this.reportDate = reportDate;
        this.outboundDials = outboundDials;
        this.totalSales = totalSales;
        this.newCashCollected = newCashCollected;
    }

    public LocalDate getReportDate() {
        return reportDate;
    }

    public Integer getOutboundDials() {
        return outboundDials;
    }

    public Integer getTotalSales() {
        return totalSales;
    }

    public java.math.BigDecimal getNewCashCollected() {
        return newCashCollected;
    }
}
