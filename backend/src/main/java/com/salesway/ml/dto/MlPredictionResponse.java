package com.salesway.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public class MlPredictionResponse {
    @JsonProperty("id")
    private final UUID id;

    @JsonProperty("company_id")
    private final UUID companyId;

    @JsonProperty("model_id")
    private final UUID modelId;

    @JsonProperty("prediction_date")
    private final LocalDate predictionDate;

    @JsonProperty("horizon_days")
    private final Integer horizonDays;

    @JsonProperty("predicted_revenue")
    private final BigDecimal predictedRevenue;

    @JsonProperty("lower_bound")
    private final BigDecimal lowerBound;

    @JsonProperty("upper_bound")
    private final BigDecimal upperBound;

    public MlPredictionResponse(
            UUID id,
            UUID companyId,
            UUID modelId,
            LocalDate predictionDate,
            Integer horizonDays,
            BigDecimal predictedRevenue,
            BigDecimal lowerBound,
            BigDecimal upperBound
    ) {
        this.id = id;
        this.companyId = companyId;
        this.modelId = modelId;
        this.predictionDate = predictionDate;
        this.horizonDays = horizonDays;
        this.predictedRevenue = predictedRevenue;
        this.lowerBound = lowerBound;
        this.upperBound = upperBound;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public UUID getModelId() {
        return modelId;
    }

    public LocalDate getPredictionDate() {
        return predictionDate;
    }

    public Integer getHorizonDays() {
        return horizonDays;
    }

    public BigDecimal getPredictedRevenue() {
        return predictedRevenue;
    }

    public BigDecimal getLowerBound() {
        return lowerBound;
    }

    public BigDecimal getUpperBound() {
        return upperBound;
    }
}
