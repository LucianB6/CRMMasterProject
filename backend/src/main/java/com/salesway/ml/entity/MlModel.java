package com.salesway.ml.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.common.enums.MlModelStatus;
import com.salesway.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

@Entity
@Table(name = "ml_models",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_ml_models_company_name_version", columnNames = {"company_id", "name", "version"})
        },
        indexes = {
                @Index(name = "idx_ml_models_company_status", columnList = "company_id, status")
        })
public class MlModel extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotBlank
    @Size(max = 255)
    @Column(name = "name", nullable = false)
    private String name;

    @NotBlank
    @Size(max = 255)
    @Column(name = "version", nullable = false)
    private String version;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MlModelStatus status;

    @Column(name = "trained_at")
    private Instant trainedAt;

    @Column(name = "metrics_json", columnDefinition = "text")
    private String metricsJsonText;

    @NotBlank
    @Column(name = "artifact_uri", nullable = false, columnDefinition = "text")
    private String artifactUri;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

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

    public MlModelStatus getStatus() {
        return status;
    }

    public void setStatus(MlModelStatus status) {
        this.status = status;
    }

    public Instant getTrainedAt() {
        return trainedAt;
    }

    public void setTrainedAt(Instant trainedAt) {
        this.trainedAt = trainedAt;
    }

    public String getMetricsJsonText() {
        return metricsJsonText;
    }

    public void setMetricsJsonText(String metricsJsonText) {
        this.metricsJsonText = metricsJsonText;
    }

    public String getArtifactUri() {
        return artifactUri;
    }

    public void setArtifactUri(String artifactUri) {
        this.artifactUri = artifactUri;
    }
}
