package com.salesway.leads.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public class PublicLeadSubmitRequest {
    @Valid
    @NotNull
    private Standard standard;

    @Valid
    @NotEmpty
    private List<Answer> answers;

    public Standard getStandard() {
        return standard;
    }

    public void setStandard(Standard standard) {
        this.standard = standard;
    }

    public List<Answer> getAnswers() {
        return answers;
    }

    public void setAnswers(List<Answer> answers) {
        this.answers = answers;
    }

    public static class Standard {
        @NotBlank
        private String firstName;
        @NotBlank
        private String lastName;
        @Email
        @NotBlank
        private String email;
        @NotBlank
        private String phone;

        public String getFirstName() {
            return firstName;
        }

        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }

        public String getLastName() {
            return lastName;
        }

        public void setLastName(String lastName) {
            this.lastName = lastName;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }
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
