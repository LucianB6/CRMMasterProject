package com.salesway.reports.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DailyReportSummaryResponse {
    @JsonProperty("from")
    private final LocalDate from;

    @JsonProperty("to")
    private final LocalDate to;

    @JsonProperty("report_count")
    private final Integer reportCount;

    @JsonProperty("outbound_dials")
    private final Integer outboundDials;

    @JsonProperty("pickups")
    private final Integer pickups;

    @JsonProperty("conversations_30s_plus")
    private final Integer conversations30sPlus;

    @JsonProperty("sales_call_booked_from_outbound")
    private final Integer salesCallBookedFromOutbound;

    @JsonProperty("sales_call_on_calendar")
    private final Integer salesCallOnCalendar;

    @JsonProperty("no_show")
    private final Integer noShow;

    @JsonProperty("reschedule_request")
    private final Integer rescheduleRequest;

    @JsonProperty("cancel")
    private final Integer cancel;

    @JsonProperty("deposits")
    private final Integer deposits;

    @JsonProperty("sales_one_call_close")
    private final Integer salesOneCallClose;

    @JsonProperty("followup_sales")
    private final Integer followupSales;

    @JsonProperty("upsell_conversation_taken")
    private final Integer upsellConversationTaken;

    @JsonProperty("upsells")
    private final Integer upsells;

    @JsonProperty("contract_value")
    private final BigDecimal contractValue;

    @JsonProperty("new_cash_collected")
    private final BigDecimal newCashCollected;

    @JsonProperty("total_sales")
    private final Integer totalSales;

    @JsonProperty("triage_passthrough_rate")
    private final BigDecimal triagePassthroughRate;

    @JsonProperty("sales_call_showup_rate")
    private final BigDecimal salesCallShowupRate;

    @JsonProperty("sit_rate")
    private final BigDecimal sitRate;

    @JsonProperty("one_call_close_rate")
    private final BigDecimal oneCallCloseRate;

    @JsonProperty("followup_close_rate")
    private final BigDecimal followupCloseRate;

    @JsonProperty("total_closing_rate")
    private final BigDecimal totalClosingRate;

    @JsonProperty("upsell_close_rate")
    private final BigDecimal upsellCloseRate;

    @JsonProperty("cash_collection_rate")
    private final BigDecimal cashCollectionRate;

    @JsonProperty("avg_contract_value_per_sale")
    private final BigDecimal avgContractValuePerSale;

    @JsonProperty("avg_cash_collected_per_sale")
    private final BigDecimal avgCashCollectedPerSale;

    public DailyReportSummaryResponse(
            LocalDate from,
            LocalDate to,
            Integer reportCount,
            Integer outboundDials,
            Integer pickups,
            Integer conversations30sPlus,
            Integer salesCallBookedFromOutbound,
            Integer salesCallOnCalendar,
            Integer noShow,
            Integer rescheduleRequest,
            Integer cancel,
            Integer deposits,
            Integer salesOneCallClose,
            Integer followupSales,
            Integer upsellConversationTaken,
            Integer upsells,
            BigDecimal contractValue,
            BigDecimal newCashCollected,
            Integer totalSales,
            BigDecimal triagePassthroughRate,
            BigDecimal salesCallShowupRate,
            BigDecimal sitRate,
            BigDecimal oneCallCloseRate,
            BigDecimal followupCloseRate,
            BigDecimal totalClosingRate,
            BigDecimal upsellCloseRate,
            BigDecimal cashCollectionRate,
            BigDecimal avgContractValuePerSale,
            BigDecimal avgCashCollectedPerSale
    ) {
        this.from = from;
        this.to = to;
        this.reportCount = reportCount;
        this.outboundDials = outboundDials;
        this.pickups = pickups;
        this.conversations30sPlus = conversations30sPlus;
        this.salesCallBookedFromOutbound = salesCallBookedFromOutbound;
        this.salesCallOnCalendar = salesCallOnCalendar;
        this.noShow = noShow;
        this.rescheduleRequest = rescheduleRequest;
        this.cancel = cancel;
        this.deposits = deposits;
        this.salesOneCallClose = salesOneCallClose;
        this.followupSales = followupSales;
        this.upsellConversationTaken = upsellConversationTaken;
        this.upsells = upsells;
        this.contractValue = contractValue;
        this.newCashCollected = newCashCollected;
        this.totalSales = totalSales;
        this.triagePassthroughRate = triagePassthroughRate;
        this.salesCallShowupRate = salesCallShowupRate;
        this.sitRate = sitRate;
        this.oneCallCloseRate = oneCallCloseRate;
        this.followupCloseRate = followupCloseRate;
        this.totalClosingRate = totalClosingRate;
        this.upsellCloseRate = upsellCloseRate;
        this.cashCollectionRate = cashCollectionRate;
        this.avgContractValuePerSale = avgContractValuePerSale;
        this.avgCashCollectedPerSale = avgCashCollectedPerSale;
    }

    public LocalDate getFrom() {
        return from;
    }

    public LocalDate getTo() {
        return to;
    }

    public Integer getReportCount() {
        return reportCount;
    }

    public Integer getOutboundDials() {
        return outboundDials;
    }

    public Integer getPickups() {
        return pickups;
    }

    public Integer getConversations30sPlus() {
        return conversations30sPlus;
    }

    public Integer getSalesCallBookedFromOutbound() {
        return salesCallBookedFromOutbound;
    }

    public Integer getSalesCallOnCalendar() {
        return salesCallOnCalendar;
    }

    public Integer getNoShow() {
        return noShow;
    }

    public Integer getRescheduleRequest() {
        return rescheduleRequest;
    }

    public Integer getCancel() {
        return cancel;
    }

    public Integer getDeposits() {
        return deposits;
    }

    public Integer getSalesOneCallClose() {
        return salesOneCallClose;
    }

    public Integer getFollowupSales() {
        return followupSales;
    }

    public Integer getUpsellConversationTaken() {
        return upsellConversationTaken;
    }

    public Integer getUpsells() {
        return upsells;
    }

    public BigDecimal getContractValue() {
        return contractValue;
    }

    public BigDecimal getNewCashCollected() {
        return newCashCollected;
    }

    public Integer getTotalSales() {
        return totalSales;
    }

    public BigDecimal getTriagePassthroughRate() {
        return triagePassthroughRate;
    }

    public BigDecimal getSalesCallShowupRate() {
        return salesCallShowupRate;
    }

    public BigDecimal getSitRate() {
        return sitRate;
    }

    public BigDecimal getOneCallCloseRate() {
        return oneCallCloseRate;
    }

    public BigDecimal getFollowupCloseRate() {
        return followupCloseRate;
    }

    public BigDecimal getTotalClosingRate() {
        return totalClosingRate;
    }

    public BigDecimal getUpsellCloseRate() {
        return upsellCloseRate;
    }

    public BigDecimal getCashCollectionRate() {
        return cashCollectionRate;
    }

    public BigDecimal getAvgContractValuePerSale() {
        return avgContractValuePerSale;
    }

    public BigDecimal getAvgCashCollectedPerSale() {
        return avgCashCollectedPerSale;
    }
}
