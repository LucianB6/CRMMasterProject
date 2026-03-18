package com.salesway.leads.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.companies.entity.Company;
import com.salesway.leads.enums.LeadInsightFeedbackStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "lead_ai_insight_memories")
public class LeadAiInsightMemory extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "recommended_action", nullable = false, columnDefinition = "text")
    private String recommendedAction;

    @Column(name = "suggested_approach", nullable = false, columnDefinition = "text")
    private String suggestedApproach;

    @Enumerated(EnumType.STRING)
    @Column(name = "feedback_status", nullable = false)
    private LeadInsightFeedbackStatus feedbackStatus = LeadInsightFeedbackStatus.NONE;

    @Column(name = "feedback_note", columnDefinition = "text")
    private String feedbackNote;

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

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
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

    public LeadInsightFeedbackStatus getFeedbackStatus() {
        return feedbackStatus;
    }

    public void setFeedbackStatus(LeadInsightFeedbackStatus feedbackStatus) {
        this.feedbackStatus = feedbackStatus;
    }

    public String getFeedbackNote() {
        return feedbackNote;
    }

    public void setFeedbackNote(String feedbackNote) {
        this.feedbackNote = feedbackNote;
    }
}
