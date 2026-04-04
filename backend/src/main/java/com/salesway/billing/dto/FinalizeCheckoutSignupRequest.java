package com.salesway.billing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class FinalizeCheckoutSignupRequest {
    @NotBlank(message = "session_id is required")
    @Pattern(
            regexp = "^cs_(test|live)_[A-Za-z0-9]+$",
            message = "session_id must be a valid Stripe Checkout Session id"
    )
    private String sessionId;

    @JsonProperty("session_id")
    public String getSessionId() {
        return sessionId;
    }

    @JsonProperty("session_id")
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}
