package com.salesway.leads.entity;

import com.salesway.common.auditing.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "lead_form_questions")
public class LeadFormQuestion extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_form_id", nullable = false)
    private LeadForm leadForm;

    @NotBlank
    @Column(name = "question_type", nullable = false)
    private String questionType;

    @NotBlank
    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "placeholder")
    private String placeholder;

    @Column(name = "help_text", columnDefinition = "text")
    private String helpText;

    @NotNull
    @Column(name = "required", nullable = false)
    private Boolean required = false;

    @Column(name = "options_json", columnDefinition = "jsonb")
    private String optionsJson;

    @NotNull
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @NotNull
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public LeadForm getLeadForm() {
        return leadForm;
    }

    public void setLeadForm(LeadForm leadForm) {
        this.leadForm = leadForm;
    }

    public String getQuestionType() {
        return questionType;
    }

    public void setQuestionType(String questionType) {
        this.questionType = questionType;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getPlaceholder() {
        return placeholder;
    }

    public void setPlaceholder(String placeholder) {
        this.placeholder = placeholder;
    }

    public String getHelpText() {
        return helpText;
    }

    public void setHelpText(String helpText) {
        this.helpText = helpText;
    }

    public Boolean getRequired() {
        return required;
    }

    public void setRequired(Boolean required) {
        this.required = required;
    }

    public String getOptionsJson() {
        return optionsJson;
    }

    public void setOptionsJson(String optionsJson) {
        this.optionsJson = optionsJson;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean active) {
        isActive = active;
    }
}
