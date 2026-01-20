package com.salesway.auth.dto;

import java.util.UUID;

public class SignupResponse {
    private final UUID userId;
    private final String email;

    public SignupResponse(UUID userId, String email) {
        this.userId = userId;
        this.email = email;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }
}
