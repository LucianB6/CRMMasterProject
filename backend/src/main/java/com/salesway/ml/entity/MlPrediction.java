package com.salesway.ml.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "ml_predictions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_ml_pred_company_model_date_horizon", columnNames = {"company_id", "model_id", "prediction_date", "horizon_days"})
        },
        indexes = {
                @Index(name = "idx_ml_pred_company_date", columnList = "company_id, prediction_date")
        })
public class MlPrediction extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id", nullable = false)
    private MlModel model;

    @NotNull
    @Column(name = "prediction_date", nullable = false)
    private LocalDate predictionDate;

    @NotNull
    @Min(0)
    @Column(name = "horizon_days", nullable = false)
    private Integer horizonDays;

    @NotNull
    @DecimalMin("0")
    @Column(name = "predicted_revenue", nullable = false, precision = 19, scale = 2)
    private BigDecimal predictedRevenue;

    @DecimalMin("0")
    @Column(name = "lower_bound", precision = 19, scale = 2)
    private BigDecimal lowerBound;

    @DecimalMin("0")
    @Column(name = "upper_bound", precision = 19, scale = 2)
    private BigDecimal upperBound;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public MlModel getModel() {
        return model;
    }

    public void setModel(MlModel model) {
        this.model = model;
    }

    public LocalDate getPredictionDate() {
        return predictionDate;
    }

    public void setPredictionDate(LocalDate predictionDate) {
        this.predictionDate = predictionDate;
    }

    public Integer getHorizonDays() {
        return horizonDays;
    }

    public void setHorizonDays(Integer horizonDays) {
        this.horizonDays = horizonDays;
    }

    public BigDecimal getPredictedRevenue() {
        return predictedRevenue;
    }

    public void setPredictedRevenue(BigDecimal predictedRevenue) {
        this.predictedRevenue = predictedRevenue;
    }

    public BigDecimal getLowerBound() {
        return lowerBound;
    }

    public void setLowerBound(BigDecimal lowerBound) {
        this.lowerBound = lowerBound;
    }

    public BigDecimal getUpperBound() {
        return upperBound;
    }

    public void setUpperBound(BigDecimal upperBound) {
        this.upperBound = upperBound;
    }
}
