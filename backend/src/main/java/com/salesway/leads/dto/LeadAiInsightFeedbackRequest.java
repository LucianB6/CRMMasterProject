package com.salesway.leads.dto;

import com.salesway.leads.enums.LeadInsightFeedbackStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class LeadAiInsightFeedbackRequest {
    @NotNull
    private LeadInsightFeedbackStatus status;

    @Size(max = 2000)
    private String note;

    public LeadInsightFeedbackStatus getStatus() {
        return status;
    }

    public void setStatus(LeadInsightFeedbackStatus status) {
        this.status = status;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
