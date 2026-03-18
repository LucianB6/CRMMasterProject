package com.salesway.leads.dto;

import com.salesway.leads.enums.LeadNoteCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LeadNoteRequest {
    @NotBlank
    @Size(max = 5000)
    private String text;

    private LeadNoteCategory category;

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public LeadNoteCategory getCategory() {
        return category;
    }

    public void setCategory(LeadNoteCategory category) {
        this.category = category;
    }
}
