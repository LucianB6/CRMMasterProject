package com.salesway.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class TrainRequest {
    @NotBlank
    @JsonProperty("name")
    private String name;

    @NotBlank
    @JsonProperty("version")
    private String version;

    @NotNull
    @Min(1)
    @JsonProperty("horizon_days")
    private Integer horizonDays;

    @NotNull
    @JsonProperty("train_from")
    private LocalDate trainFrom;

    @NotNull
    @JsonProperty("train_to")
    private LocalDate trainTo;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public Integer getHorizonDays() {
        return horizonDays;
    }

    public void setHorizonDays(Integer horizonDays) {
        this.horizonDays = horizonDays;
    }

    public LocalDate getTrainFrom() {
        return trainFrom;
    }

    public void setTrainFrom(LocalDate trainFrom) {
        this.trainFrom = trainFrom;
    }

    public LocalDate getTrainTo() {
        return trainTo;
    }

    public void setTrainTo(LocalDate trainTo) {
        this.trainTo = trainTo;
    }
}
