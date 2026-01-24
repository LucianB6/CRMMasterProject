package com.salesway.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class TrainResponse {
    @JsonProperty("model_id")
    private UUID modelId;

    @JsonProperty("metrics_json")
    private String metricsJson;

    @JsonProperty("artifact_uri")
    private String artifactUri;

    public UUID getModelId() {
        return modelId;
    }

    public void setModelId(UUID modelId) {
        this.modelId = modelId;
    }

    public String getMetricsJson() {
        return metricsJson;
    }

    public void setMetricsJson(String metricsJson) {
        this.metricsJson = metricsJson;
    }

    public String getArtifactUri() {
        return artifactUri;
    }

    public void setArtifactUri(String artifactUri) {
        this.artifactUri = artifactUri;
    }
}
