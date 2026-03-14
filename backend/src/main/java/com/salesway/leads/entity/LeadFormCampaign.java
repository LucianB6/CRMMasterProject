package com.salesway.leads.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.leads.enums.CampaignChannel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "lead_form_campaigns", indexes = {
        @Index(name = "idx_lead_form_campaigns_form_created", columnList = "lead_form_id,created_at"),
        @Index(name = "idx_lead_form_campaigns_form_active", columnList = "lead_form_id,is_active")
})
public class LeadFormCampaign extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_form_id", nullable = false)
    private LeadForm leadForm;

    @NotBlank
    @Size(max = 255)
    @Column(name = "name", nullable = false)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false)
    private CampaignChannel channel;

    @NotBlank
    @Size(max = 255)
    @Column(name = "campaign_code", nullable = false)
    private String campaignCode;

    @Size(max = 255)
    @Column(name = "utm_source")
    private String utmSource;

    @Size(max = 255)
    @Column(name = "utm_medium")
    private String utmMedium;

    @NotNull
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public LeadForm getLeadForm() {
        return leadForm;
    }

    public void setLeadForm(LeadForm leadForm) {
        this.leadForm = leadForm;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CampaignChannel getChannel() {
        return channel;
    }

    public void setChannel(CampaignChannel channel) {
        this.channel = channel;
    }

    public String getCampaignCode() {
        return campaignCode;
    }

    public void setCampaignCode(String campaignCode) {
        this.campaignCode = campaignCode;
    }

    public String getUtmSource() {
        return utmSource;
    }

    public void setUtmSource(String utmSource) {
        this.utmSource = utmSource;
    }

    public String getUtmMedium() {
        return utmMedium;
    }

    public void setUtmMedium(String utmMedium) {
        this.utmMedium = utmMedium;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean active) {
        isActive = active;
    }
}
