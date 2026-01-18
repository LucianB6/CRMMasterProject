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
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "daily_report_metrics")
public class DailyReportMetrics extends AuditedEntity {
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
    @Column(name = "total_sales", nullable = false)
    private Integer totalSales = 0;

    @NotNull
    @DecimalMin("0")
    @Column(name = "commission_usd", nullable = false, precision = 19, scale = 2)
    private BigDecimal commissionUsd = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "triage_passthrough_rate", nullable = false, precision = 8, scale = 5)
    private BigDecimal triagePassthroughRate = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "sales_call_showup_rate", nullable = false, precision = 8, scale = 5)
    private BigDecimal salesCallShowupRate = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "sit_rate", nullable = false, precision = 8, scale = 5)
    private BigDecimal sitRate = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "one_call_close_rate", nullable = false, precision = 8, scale = 5)
    private BigDecimal oneCallCloseRate = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "followup_close_rate", nullable = false, precision = 8, scale = 5)
    private BigDecimal followupCloseRate = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "total_closing_rate", nullable = false, precision = 8, scale = 5)
    private BigDecimal totalClosingRate = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "upsell_close_rate", nullable = false, precision = 8, scale = 5)
    private BigDecimal upsellCloseRate = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "cash_collection_rate", nullable = false, precision = 8, scale = 5)
    private BigDecimal cashCollectionRate = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "avg_contract_value_per_sale", nullable = false, precision = 19, scale = 2)
    private BigDecimal avgContractValuePerSale = BigDecimal.ZERO;

    @NotNull
    @DecimalMin("0")
    @Column(name = "avg_cash_collected_per_sale", nullable = false, precision = 19, scale = 2)
    private BigDecimal avgCashCollectedPerSale = BigDecimal.ZERO;

    @NotBlank
    @Size(max = 64)
    @Column(name = "formula_version", nullable = false)
    private String formulaVersion = "v1";

    @NotNull
    @Column(name = "computed_at", nullable = false)
    private Instant computedAt;

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

    public Integer getTotalSales() {
        return totalSales;
    }

    public void setTotalSales(Integer totalSales) {
        this.totalSales = totalSales;
    }

    public BigDecimal getCommissionUsd() {
        return commissionUsd;
    }

    public void setCommissionUsd(BigDecimal commissionUsd) {
        this.commissionUsd = commissionUsd;
    }

    public BigDecimal getTriagePassthroughRate() {
        return triagePassthroughRate;
    }

    public void setTriagePassthroughRate(BigDecimal triagePassthroughRate) {
        this.triagePassthroughRate = triagePassthroughRate;
    }

    public BigDecimal getSalesCallShowupRate() {
        return salesCallShowupRate;
    }

    public void setSalesCallShowupRate(BigDecimal salesCallShowupRate) {
        this.salesCallShowupRate = salesCallShowupRate;
    }

    public BigDecimal getSitRate() {
        return sitRate;
    }

    public void setSitRate(BigDecimal sitRate) {
        this.sitRate = sitRate;
    }

    public BigDecimal getOneCallCloseRate() {
        return oneCallCloseRate;
    }

    public void setOneCallCloseRate(BigDecimal oneCallCloseRate) {
        this.oneCallCloseRate = oneCallCloseRate;
    }

    public BigDecimal getFollowupCloseRate() {
        return followupCloseRate;
    }

    public void setFollowupCloseRate(BigDecimal followupCloseRate) {
        this.followupCloseRate = followupCloseRate;
    }

    public BigDecimal getTotalClosingRate() {
        return totalClosingRate;
    }

    public void setTotalClosingRate(BigDecimal totalClosingRate) {
        this.totalClosingRate = totalClosingRate;
    }

    public BigDecimal getUpsellCloseRate() {
        return upsellCloseRate;
    }

    public void setUpsellCloseRate(BigDecimal upsellCloseRate) {
        this.upsellCloseRate = upsellCloseRate;
    }

    public BigDecimal getCashCollectionRate() {
        return cashCollectionRate;
    }

    public void setCashCollectionRate(BigDecimal cashCollectionRate) {
        this.cashCollectionRate = cashCollectionRate;
    }

    public BigDecimal getAvgContractValuePerSale() {
        return avgContractValuePerSale;
    }

    public void setAvgContractValuePerSale(BigDecimal avgContractValuePerSale) {
        this.avgContractValuePerSale = avgContractValuePerSale;
    }

    public BigDecimal getAvgCashCollectedPerSale() {
        return avgCashCollectedPerSale;
    }

    public void setAvgCashCollectedPerSale(BigDecimal avgCashCollectedPerSale) {
        this.avgCashCollectedPerSale = avgCashCollectedPerSale;
    }

    public String getFormulaVersion() {
        return formulaVersion;
    }

    public void setFormulaVersion(String formulaVersion) {
        this.formulaVersion = formulaVersion;
    }

    public Instant getComputedAt() {
        return computedAt;
    }

    public void setComputedAt(Instant computedAt) {
        this.computedAt = computedAt;
    }
}
