package com.salesway.leads.dto;

import jakarta.validation.constraints.NotBlank;

public class LeadStatusUpdateRequest {
    @NotBlank
    private String status;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
