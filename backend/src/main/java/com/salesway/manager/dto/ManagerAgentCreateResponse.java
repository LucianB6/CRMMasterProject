package com.salesway.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class ManagerAgentCreateResponse {
    @JsonProperty("membership_id")
    private final UUID membershipId;

    @JsonProperty("user_id")
    private final UUID userId;

    @JsonProperty("email")
    private final String email;

    public ManagerAgentCreateResponse(UUID membershipId, UUID userId, String email) {
        this.membershipId = membershipId;
        this.userId = userId;
        this.email = email;
    }

    public UUID getMembershipId() {
        return membershipId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }
}
