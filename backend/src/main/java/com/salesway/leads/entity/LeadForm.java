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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "lead_forms", uniqueConstraints = {
        @UniqueConstraint(name = "uq_lead_forms_company", columnNames = "company_id"),
        @UniqueConstraint(name = "uq_lead_forms_public_slug", columnNames = "public_slug")
})
public class LeadForm extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotBlank
    @Column(name = "title", nullable = false)
    private String title = "Lead Form";

    @NotBlank
    @Column(name = "public_slug", nullable = false)
    private String publicSlug;

    @NotNull
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getPublicSlug() {
        return publicSlug;
    }

    public void setPublicSlug(String publicSlug) {
        this.publicSlug = publicSlug;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean active) {
        isActive = active;
    }
}
