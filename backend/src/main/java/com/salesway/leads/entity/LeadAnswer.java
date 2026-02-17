package com.salesway.leads.entity;

import com.salesway.common.auditing.CreatedOnlyEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "lead_answers")
public class LeadAnswer extends CreatedOnlyEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id", nullable = false)
    private Lead lead;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private LeadFormQuestion question;

    @NotBlank
    @Column(name = "answer_value", nullable = false, columnDefinition = "jsonb")
    private String answerValue;

    @NotBlank
    @Column(name = "question_label_snapshot", nullable = false)
    private String questionLabelSnapshot;

    @NotBlank
    @Column(name = "question_type_snapshot", nullable = false)
    private String questionTypeSnapshot;

    @NotNull
    @Column(name = "required_snapshot", nullable = false)
    private Boolean requiredSnapshot;

    @Column(name = "options_snapshot", columnDefinition = "jsonb")
    private String optionsSnapshot;

    public Lead getLead() {
        return lead;
    }

    public void setLead(Lead lead) {
        this.lead = lead;
    }

    public LeadFormQuestion getQuestion() {
        return question;
    }

    public void setQuestion(LeadFormQuestion question) {
        this.question = question;
    }

    public String getAnswerValue() {
        return answerValue;
    }

    public void setAnswerValue(String answerValue) {
        this.answerValue = answerValue;
    }

    public String getQuestionLabelSnapshot() {
        return questionLabelSnapshot;
    }

    public void setQuestionLabelSnapshot(String questionLabelSnapshot) {
        this.questionLabelSnapshot = questionLabelSnapshot;
    }

    public String getQuestionTypeSnapshot() {
        return questionTypeSnapshot;
    }

    public void setQuestionTypeSnapshot(String questionTypeSnapshot) {
        this.questionTypeSnapshot = questionTypeSnapshot;
    }

    public Boolean getRequiredSnapshot() {
        return requiredSnapshot;
    }

    public void setRequiredSnapshot(Boolean requiredSnapshot) {
        this.requiredSnapshot = requiredSnapshot;
    }

    public String getOptionsSnapshot() {
        return optionsSnapshot;
    }

    public void setOptionsSnapshot(String optionsSnapshot) {
        this.optionsSnapshot = optionsSnapshot;
    }
}
