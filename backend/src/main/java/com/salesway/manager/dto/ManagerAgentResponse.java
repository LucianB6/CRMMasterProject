package com.salesway.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class ManagerAgentResponse {
    @JsonProperty("membership_id")
    private final UUID membershipId;

    @JsonProperty("user_id")
    private final UUID userId;

    @JsonProperty("email")
    private final String email;

    @JsonProperty("status")
    private final String status;

    @JsonProperty("team_id")
    private final UUID teamId;

    @JsonProperty("team_name")
    private final String teamName;

    public ManagerAgentResponse(
            UUID membershipId,
            UUID userId,
            String email,
            String status,
            UUID teamId,
            String teamName
    ) {
        this.membershipId = membershipId;
        this.userId = userId;
        this.email = email;
        this.status = status;
        this.teamId = teamId;
        this.teamName = teamName;
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

    public String getStatus() {
        return status;
    }

    public UUID getTeamId() {
        return teamId;
    }

    public String getTeamName() {
        return teamName;
    }
}
