package com.salesway.leads.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

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
}
