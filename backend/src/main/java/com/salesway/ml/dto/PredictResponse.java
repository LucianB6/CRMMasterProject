package com.salesway.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class PredictResponse {
    @JsonProperty("predictions")
    private List<PredictionItem> predictions;

    public List<PredictionItem> getPredictions() {
        return predictions;
    }

    public void setPredictions(List<PredictionItem> predictions) {
        this.predictions = predictions;
    }

    public static class PredictionItem {
        @JsonProperty("date")
        private LocalDate date;

        @JsonProperty("horizon_days")
        private Integer horizonDays;

        @JsonProperty("predicted_revenue")
        private BigDecimal predictedRevenue;

        @JsonProperty("lower_bound")
        private BigDecimal lowerBound;

        @JsonProperty("upper_bound")
        private BigDecimal upperBound;

        public LocalDate getDate() {
            return date;
        }

        public void setDate(LocalDate date) {
            this.date = date;
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
}
