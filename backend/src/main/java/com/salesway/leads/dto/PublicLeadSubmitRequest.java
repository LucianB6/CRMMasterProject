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

    @Valid
    private Tracking tracking;

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

    public Tracking getTracking() {
        return tracking;
    }

    public void setTracking(Tracking tracking) {
        this.tracking = tracking;
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

    public static class Tracking {
        private String source;
        private String campaign;
        private String adSet;
        private String adId;
        private String utmSource;
        private String utmCampaign;
        private String utmMedium;
        private String utmContent;
        private String landingPage;
        private String referrer;

        public String getSource() {
            return source;
        }

        public void setSource(String source) {
            this.source = source;
        }

        public String getCampaign() {
            return campaign;
        }

        public void setCampaign(String campaign) {
            this.campaign = campaign;
        }

        public String getAdSet() {
            return adSet;
        }

        public void setAdSet(String adSet) {
            this.adSet = adSet;
        }

        public String getAdId() {
            return adId;
        }

        public void setAdId(String adId) {
            this.adId = adId;
        }

        public String getUtmSource() {
            return utmSource;
        }

        public void setUtmSource(String utmSource) {
            this.utmSource = utmSource;
        }

        public String getUtmCampaign() {
            return utmCampaign;
        }

        public void setUtmCampaign(String utmCampaign) {
            this.utmCampaign = utmCampaign;
        }

        public String getUtmMedium() {
            return utmMedium;
        }

        public void setUtmMedium(String utmMedium) {
            this.utmMedium = utmMedium;
        }

        public String getUtmContent() {
            return utmContent;
        }

        public void setUtmContent(String utmContent) {
            this.utmContent = utmContent;
        }

        public String getLandingPage() {
            return landingPage;
        }

        public void setLandingPage(String landingPage) {
            this.landingPage = landingPage;
        }

        public String getReferrer() {
            return referrer;
        }

        public void setReferrer(String referrer) {
            this.referrer = referrer;
        }
    }
}
