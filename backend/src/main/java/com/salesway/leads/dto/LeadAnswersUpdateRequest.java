package com.salesway.leads.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class LeadAnswersUpdateRequest {
    @Valid
    @NotNull
    private List<Answer> answers = new ArrayList<>();

    public List<Answer> getAnswers() {
        return answers;
    }

    public void setAnswers(List<Answer> answers) {
        this.answers = answers;
    }

    public static class Answer {
        @NotNull
        private UUID questionId;

        @NotNull
        private JsonNode value;

        public UUID getQuestionId() {
            return questionId;
        }

        public void setQuestionId(UUID questionId) {
            this.questionId = questionId;
        }

        public JsonNode getValue() {
            return value;
        }

        public void setValue(JsonNode value) {
            this.value = value;
        }
    }
}
