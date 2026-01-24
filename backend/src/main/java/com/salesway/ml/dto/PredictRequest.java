package com.salesway.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

public class PredictRequest {
    @NotNull
    @JsonProperty("model_id")
    private UUID modelId;

    @NotNull
    @JsonProperty("prediction_date")
    private LocalDate predictionDate;

    @NotNull
    @Min(1)
    @JsonProperty("horizon_days")
    private Integer horizonDays;

    public UUID getModelId() {
        return modelId;
    }

    public void setModelId(UUID modelId) {
        this.modelId = modelId;
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
}
