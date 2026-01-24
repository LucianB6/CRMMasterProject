package com.salesway.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class ForecastResponse {
    @JsonProperty("model_id")
    private UUID modelId;

    @JsonProperty("trained_at")
    private Instant trainedAt;

    @JsonProperty("period_days")
    private Integer periodDays;

    @JsonProperty("total")
    private BigDecimal total;

    @JsonProperty("daily_predictions")
    private List<DailyPrediction> dailyPredictions;

    public UUID getModelId() {
        return modelId;
    }

    public void setModelId(UUID modelId) {
        this.modelId = modelId;
    }

    public Instant getTrainedAt() {
        return trainedAt;
    }

    public void setTrainedAt(Instant trainedAt) {
        this.trainedAt = trainedAt;
    }

    public Integer getPeriodDays() {
        return periodDays;
    }

    public void setPeriodDays(Integer periodDays) {
        this.periodDays = periodDays;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public List<DailyPrediction> getDailyPredictions() {
        return dailyPredictions;
    }

    public void setDailyPredictions(List<DailyPrediction> dailyPredictions) {
        this.dailyPredictions = dailyPredictions;
    }

    public static class DailyPrediction {
        @JsonProperty("date")
        private LocalDate date;

        @JsonProperty("value")
        private BigDecimal value;

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate date) {
            this.date = date;
        }

        public BigDecimal getValue() {
            return value;
        }

        public void setValue(BigDecimal value) {
            this.value = value;
        }
    }
}
