package com.salesway.ml.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.salesway.common.enums.MlModelStatus;

import java.time.Instant;
import java.util.UUID;

public class MlModelResponse {
    @JsonProperty("id")
    private final UUID id;

    @JsonProperty("company_id")
    private final UUID companyId;

    @JsonProperty("name")
    private final String name;

    @JsonProperty("version")
    private final String version;

    @JsonProperty("status")
    private final MlModelStatus status;

    @JsonProperty("trained_at")
    private final Instant trainedAt;

    @JsonProperty("metrics_json")
    private final String metricsJson;

    @JsonProperty("artifact_uri")
    private final String artifactUri;

    public MlModelResponse(
            UUID id,
            UUID companyId,
            String name,
            String version,
            MlModelStatus status,
            Instant trainedAt,
            String metricsJson,
            String artifactUri
    ) {
        this.id = id;
        this.companyId = companyId;
        this.name = name;
        this.version = version;
        this.status = status;
        this.trainedAt = trainedAt;
        this.metricsJson = metricsJson;
        this.artifactUri = artifactUri;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public String getName() {
        return name;
    }

    public String getVersion() {
        return version;
    }

    public MlModelStatus getStatus() {
        return status;
    }

    public Instant getTrainedAt() {
        return trainedAt;
    }

    public String getMetricsJson() {
        return metricsJson;
    }

    public String getArtifactUri() {
        return artifactUri;
    }
}
