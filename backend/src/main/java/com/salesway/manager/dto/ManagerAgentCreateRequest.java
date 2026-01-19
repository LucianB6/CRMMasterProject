package com.salesway.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public class ManagerAgentCreateRequest {
    @NotBlank
    @Email
    @Size(max = 255)
    @JsonProperty("email")
    private String email;

    @NotBlank
    @Size(max = 255)
    @JsonProperty("password")
    private String password;

    @JsonProperty("team_id")
    private UUID teamId;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public UUID getTeamId() {
        return teamId;
    }

    public void setTeamId(UUID teamId) {
        this.teamId = teamId;
    }
}
