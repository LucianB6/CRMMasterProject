package com.salesway.reports.entity;

import com.salesway.common.auditing.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "daily_report_inputs")
public class DailyReportInputs extends AuditedEntity {
    @Id
    @Column(name = "daily_report_id", nullable = false, updatable = false)
    private UUID id;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "daily_report_id", nullable = false)
    private DailyReport dailyReport;

    @NotNull
    @Min(0)
    @Column(name = "outbound_dials", nullable = false)
    private Integer outboundDials = 0;

    @NotNull
    @Min(0)
    @Column(name = "pickups", nullable = false)
    private Integer pickups = 0;

    @NotNull
    @Min(0)
    @Column(name = "conversations_30s_plus", nullable = false)
    private Integer conversations30sPlus = 0;

    @NotNull
    @Min(0)
    @Column(name = "sales_call_booked_from_outbound", nullable = false)
    private Integer salesCallBookedFromOutbound = 0;

    @NotNull
    @Min(0)
    @Column(name = "sales_call_on_calendar", nullable = false)
    private Integer salesCallOnCalendar = 0;

    @NotNull
    @Min(0)
    @Column(name = "no_show", nullable = false)
    private Integer noShow = 0;

    @NotNull
    @Min(0)
    @Column(name = "reschedule_request", nullable = false)
    private Integer rescheduleRequest = 0;

    @NotNull
    @Min(0)
    @Column(name = "cancel", nullable = false)
    private Integer cancel = 0;

    @NotNull
    @Min(0)
    @Column(name = "deposits", nullable = false)
    private Integer deposits = 0;

    @NotNull
    @Min(0)
    @Column(name = "sales_one_call_close", nullable = false)
    private Integer salesOneCallClose = 0;

    @NotNull
    @Min(0)
    @Column(name = "followup_sales", nullable = false)
    private Integer followupSales = 0;

    @NotNull
    @Min(0)
    @Column(name = "upsell_conversation_taken", nullable = false)
    private Integer upsellConversationTaken = 0;

    @NotNull
    @Min(0)
    @Column(name = "upsells", nullable = false)
    private Integer upsells = 0;

    @NotNull
    @Min(0)
    @Column(name = "contract_value", nullable = false, precision = 19, scale = 2)
    private BigDecimal contractValue = BigDecimal.ZERO;

    @NotNull
    @Min(0)
    @Column(name = "new_cash_collected", nullable = false, precision = 19, scale = 2)
    private BigDecimal newCashCollected = BigDecimal.ZERO;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public DailyReport getDailyReport() {
        return dailyReport;
    }

    public void setDailyReport(DailyReport dailyReport) {
        this.dailyReport = dailyReport;
    }

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
