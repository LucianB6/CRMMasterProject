package com.salesway.reports.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public class DailyReportInputsResponse {
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

    @JsonProperty("observations")
    private final String observations;

    public DailyReportInputsResponse(
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
            String observations
    ) {
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
        this.observations = observations;
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

    public String getObservations() {
        return observations;
    }
}
