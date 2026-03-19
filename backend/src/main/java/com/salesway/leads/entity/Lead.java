package com.salesway.leads.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "leads")
public class Lead extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_form_id", nullable = false)
    private LeadForm leadForm;

    @NotBlank
    @Column(name = "source", nullable = false)
    private String source = "form";

    @NotBlank
    @Column(name = "status", nullable = false)
    private String status = "new";

    @NotNull
    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "assigned_to_user_id")
    private UUID assignedToUserId;

    @Column(name = "assigned_by_user_id")
    private UUID assignedByUserId;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "last_activity_at")
    private Instant lastActivityAt;

    @Column(name = "campaign")
    private String campaign;

    @Column(name = "ad_set")
    private String adSet;

    @Column(name = "ad_id")
    private String adId;

    @Column(name = "utm_source")
    private String utmSource;

    @Column(name = "utm_campaign")
    private String utmCampaign;

    @Column(name = "utm_medium")
    private String utmMedium;

    @Column(name = "utm_content")
    private String utmContent;

    @Column(name = "landing_page")
    private String landingPage;

    @Column(name = "referrer")
    private String referrer;

    @Column(name = "duplicate_group_id")
    private UUID duplicateGroupId;

    @Column(name = "duplicate_of_lead_id")
    private UUID duplicateOfLeadId;

    @Column(name = "ai_status")
    private String aiStatus;

    @Column(name = "ai_score")
    private Integer aiScore;

    @Column(name = "ai_summary")
    private String aiSummary;

    @Column(name = "ai_error")
    private String aiError;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private PipelineStage stage;

    @OneToOne(mappedBy = "lead", fetch = FetchType.LAZY)
    private LeadStandardFields standardFields;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public LeadForm getLeadForm() {
        return leadForm;
    }

    public void setLeadForm(LeadForm leadForm) {
        this.leadForm = leadForm;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public UUID getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(UUID assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public UUID getAssignedByUserId() {
        return assignedByUserId;
    }

    public void setAssignedByUserId(UUID assignedByUserId) {
        this.assignedByUserId = assignedByUserId;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }

    public void setAssignedAt(Instant assignedAt) {
        this.assignedAt = assignedAt;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public String getCampaign() {
        return campaign;
    }

    public void setCampaign(String campaign) {
        this.campaign = campaign;
    }

    public String getAdSet() {
        return adSet;
    }

    public void setAdSet(String adSet) {
        this.adSet = adSet;
    }

    public String getAdId() {
        return adId;
    }

    public void setAdId(String adId) {
        this.adId = adId;
    }

    public String getUtmSource() {
        return utmSource;
    }

    public void setUtmSource(String utmSource) {
        this.utmSource = utmSource;
    }

    public String getUtmCampaign() {
        return utmCampaign;
    }

    public void setUtmCampaign(String utmCampaign) {
        this.utmCampaign = utmCampaign;
    }

    public String getUtmMedium() {
        return utmMedium;
    }

    public void setUtmMedium(String utmMedium) {
        this.utmMedium = utmMedium;
    }

    public String getUtmContent() {
        return utmContent;
    }

    public void setUtmContent(String utmContent) {
        this.utmContent = utmContent;
    }

    public String getLandingPage() {
        return landingPage;
    }

    public void setLandingPage(String landingPage) {
        this.landingPage = landingPage;
    }

    public String getReferrer() {
        return referrer;
    }

    public void setReferrer(String referrer) {
        this.referrer = referrer;
    }

    public UUID getDuplicateGroupId() {
        return duplicateGroupId;
    }

    public void setDuplicateGroupId(UUID duplicateGroupId) {
        this.duplicateGroupId = duplicateGroupId;
    }

    public UUID getDuplicateOfLeadId() {
        return duplicateOfLeadId;
    }

    public void setDuplicateOfLeadId(UUID duplicateOfLeadId) {
        this.duplicateOfLeadId = duplicateOfLeadId;
    }

    public String getAiStatus() {
        return aiStatus;
    }

    public void setAiStatus(String aiStatus) {
        this.aiStatus = aiStatus;
    }

    public Integer getAiScore() {
        return aiScore;
    }

    public void setAiScore(Integer aiScore) {
        this.aiScore = aiScore;
    }

    public String getAiSummary() {
        return aiSummary;
    }

    public void setAiSummary(String aiSummary) {
        this.aiSummary = aiSummary;
    }

    public String getAiError() {
        return aiError;
    }

    public void setAiError(String aiError) {
        this.aiError = aiError;
    }

    public PipelineStage getStage() {
        return stage;
    }

    public void setStage(PipelineStage stage) {
        this.stage = stage;
    }

    public LeadStandardFields getStandardFields() {
        return standardFields;
    }

    public void setStandardFields(LeadStandardFields standardFields) {
        this.standardFields = standardFields;
    }
}
