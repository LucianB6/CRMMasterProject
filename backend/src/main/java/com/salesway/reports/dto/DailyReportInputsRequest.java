package com.salesway.reports.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class DailyReportInputsRequest {
    @NotNull
    @Min(0)
    @JsonProperty("outbound_dials")
    private Integer outboundDials;

    @NotNull
    @Min(0)
    @JsonProperty("pickups")
    private Integer pickups;

    @NotNull
    @Min(0)
    @JsonProperty("conversations_30s_plus")
    private Integer conversations30sPlus;

    @NotNull
    @Min(0)
    @JsonProperty("sales_call_booked_from_outbound")
    private Integer salesCallBookedFromOutbound;

    @NotNull
    @Min(0)
    @JsonProperty("sales_call_on_calendar")
    private Integer salesCallOnCalendar;

    @NotNull
    @Min(0)
    @JsonProperty("no_show")
    private Integer noShow;

    @NotNull
    @Min(0)
    @JsonProperty("reschedule_request")
    private Integer rescheduleRequest;

    @NotNull
    @Min(0)
    @JsonProperty("cancel")
    private Integer cancel;

    @NotNull
    @Min(0)
    @JsonProperty("deposits")
    private Integer deposits;

    @NotNull
    @Min(0)
    @JsonProperty("sales_one_call_close")
    private Integer salesOneCallClose;

    @NotNull
    @Min(0)
    @JsonProperty("followup_sales")
    private Integer followupSales;

    @NotNull
    @Min(0)
    @JsonProperty("upsell_conversation_taken")
    private Integer upsellConversationTaken;

    @NotNull
    @Min(0)
    @JsonProperty("upsells")
    private Integer upsells;

    @NotNull
    @DecimalMin("0")
    @JsonProperty("contract_value")
    private BigDecimal contractValue;

    @NotNull
    @DecimalMin("0")
    @JsonProperty("new_cash_collected")
    private BigDecimal newCashCollected;

    public Integer getOutboundDials() {
        return outboundDials;
    }

    public void setOutboundDials(Integer outboundDials) {
        this.outboundDials = outboundDials;
    }

    public Integer getPickups() {
        return pickups;
    }

    public void setPickups(Integer pickups) {
        this.pickups = pickups;
    }

    public Integer getConversations30sPlus() {
        return conversations30sPlus;
    }

    public void setConversations30sPlus(Integer conversations30sPlus) {
        this.conversations30sPlus = conversations30sPlus;
    }

    public Integer getSalesCallBookedFromOutbound() {
        return salesCallBookedFromOutbound;
    }

    public void setSalesCallBookedFromOutbound(Integer salesCallBookedFromOutbound) {
        this.salesCallBookedFromOutbound = salesCallBookedFromOutbound;
    }

    public Integer getSalesCallOnCalendar() {
        return salesCallOnCalendar;
    }

    public void setSalesCallOnCalendar(Integer salesCallOnCalendar) {
        this.salesCallOnCalendar = salesCallOnCalendar;
    }

    public Integer getNoShow() {
        return noShow;
    }

    public void setNoShow(Integer noShow) {
        this.noShow = noShow;
    }

    public Integer getRescheduleRequest() {
        return rescheduleRequest;
    }

    public void setRescheduleRequest(Integer rescheduleRequest) {
        this.rescheduleRequest = rescheduleRequest;
    }

    public Integer getCancel() {
        return cancel;
    }

    public void setCancel(Integer cancel) {
        this.cancel = cancel;
    }

    public Integer getDeposits() {
        return deposits;
    }

    public void setDeposits(Integer deposits) {
        this.deposits = deposits;
    }

    public Integer getSalesOneCallClose() {
        return salesOneCallClose;
    }

    public void setSalesOneCallClose(Integer salesOneCallClose) {
        this.salesOneCallClose = salesOneCallClose;
    }

    public Integer getFollowupSales() {
        return followupSales;
    }

    public void setFollowupSales(Integer followupSales) {
        this.followupSales = followupSales;
    }

    public Integer getUpsellConversationTaken() {
        return upsellConversationTaken;
    }

    public void setUpsellConversationTaken(Integer upsellConversationTaken) {
        this.upsellConversationTaken = upsellConversationTaken;
    }

    public Integer getUpsells() {
        return upsells;
    }

    public void setUpsells(Integer upsells) {
        this.upsells = upsells;
    }

    public BigDecimal getContractValue() {
        return contractValue;
    }

    public void setContractValue(BigDecimal contractValue) {
        this.contractValue = contractValue;
    }

    public BigDecimal getNewCashCollected() {
        return newCashCollected;
    }

    public void setNewCashCollected(BigDecimal newCashCollected) {
        this.newCashCollected = newCashCollected;
    }
}
