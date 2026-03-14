package com.salesway.leads.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "lead_ai_insight_snapshots",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_lead_ai_insight_snapshots_lead_company", columnNames = {"lead_id", "company_id"})
        }
)
public class LeadAiInsightSnapshot extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "latest_insight_memory_id")
    private UUID latestInsightMemoryId;

    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "relationship_sentiment")
    private String relationshipSentiment;

    @Column(name = "relationship_risk_level")
    private String relationshipRiskLevel;

    @Column(name = "relationship_trend")
    private String relationshipTrend;

    @Column(name = "relationship_key_blocker", columnDefinition = "text")
    private String relationshipKeyBlocker;

    @Column(name = "confidence_score", nullable = false)
    private double confidenceScore;

    @Column(name = "confidence_level")
    private String confidenceLevel;

    @Column(name = "guidance_source")
    private String guidanceSource;

    @Column(name = "recommended_action", nullable = false, columnDefinition = "text")
    private String recommendedAction;

    @Column(name = "suggested_approach", nullable = false, columnDefinition = "text")
    private String suggestedApproach;

    @Column(name = "next_best_action", columnDefinition = "text")
    private String nextBestActionJson;

    @Column(name = "what_changed", columnDefinition = "text")
    private String whatChangedJson;

    @Column(name = "explainability", columnDefinition = "text")
    private String explainabilityJson;

    @Column(name = "score_factors", columnDefinition = "text")
    private String scoreFactorsJson;

    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;

    @Column(name = "last_regenerated_at", nullable = false)
    private Instant lastRegeneratedAt;

    public Lead getLead() {
        return lead;
    }

    public void setLead(Lead lead) {
        this.lead = lead;
    }

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public UUID getLatestInsightMemoryId() {
        return latestInsightMemoryId;
    }

    public void setLatestInsightMemoryId(UUID latestInsightMemoryId) {
        this.latestInsightMemoryId = latestInsightMemoryId;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public String getRelationshipSentiment() {
        return relationshipSentiment;
    }

    public void setRelationshipSentiment(String relationshipSentiment) {
        this.relationshipSentiment = relationshipSentiment;
    }

    public String getRelationshipRiskLevel() {
        return relationshipRiskLevel;
    }

    public void setRelationshipRiskLevel(String relationshipRiskLevel) {
        this.relationshipRiskLevel = relationshipRiskLevel;
    }

    public String getRelationshipTrend() {
        return relationshipTrend;
    }

    public void setRelationshipTrend(String relationshipTrend) {
        this.relationshipTrend = relationshipTrend;
    }

    public String getRelationshipKeyBlocker() {
        return relationshipKeyBlocker;
    }

    public void setRelationshipKeyBlocker(String relationshipKeyBlocker) {
        this.relationshipKeyBlocker = relationshipKeyBlocker;
    }

    public double getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(double confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public String getConfidenceLevel() {
        return confidenceLevel;
    }

    public void setConfidenceLevel(String confidenceLevel) {
        this.confidenceLevel = confidenceLevel;
    }

    public String getGuidanceSource() {
        return guidanceSource;
    }

    public void setGuidanceSource(String guidanceSource) {
        this.guidanceSource = guidanceSource;
    }

    public String getRecommendedAction() {
        return recommendedAction;
    }

    public void setRecommendedAction(String recommendedAction) {
        this.recommendedAction = recommendedAction;
    }

    public String getSuggestedApproach() {
        return suggestedApproach;
    }

    public void setSuggestedApproach(String suggestedApproach) {
        this.suggestedApproach = suggestedApproach;
    }

    public String getNextBestActionJson() {
        return nextBestActionJson;
    }

    public void setNextBestActionJson(String nextBestActionJson) {
        this.nextBestActionJson = nextBestActionJson;
    }

    public String getWhatChangedJson() {
        return whatChangedJson;
    }

    public void setWhatChangedJson(String whatChangedJson) {
        this.whatChangedJson = whatChangedJson;
    }

    public String getExplainabilityJson() {
        return explainabilityJson;
    }

    public void setExplainabilityJson(String explainabilityJson) {
        this.explainabilityJson = explainabilityJson;
    }

    public String getScoreFactorsJson() {
        return scoreFactorsJson;
    }

    public void setScoreFactorsJson(String scoreFactorsJson) {
        this.scoreFactorsJson = scoreFactorsJson;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public Instant getLastRegeneratedAt() {
        return lastRegeneratedAt;
    }

    public void setLastRegeneratedAt(Instant lastRegeneratedAt) {
        this.lastRegeneratedAt = lastRegeneratedAt;
    }
}
