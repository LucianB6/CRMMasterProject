package com.salesway.leads.dto;

import jakarta.validation.constraints.NotBlank;

public class LeadFormUpdateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String publicSlug;

    private Boolean isActive = true;

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
