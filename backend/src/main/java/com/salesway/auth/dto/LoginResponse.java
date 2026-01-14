package com.salesway.auth.dto;

import java.time.Instant;
import java.util.UUID;

public class LoginResponse {
    private final String token;
    private final UUID userId;
    private final String email;
    private final Instant lastLoginAt;

    public LoginResponse(String token, UUID userId, String email, Instant lastLoginAt) {
        this.token = token;
        this.userId = userId;
        this.email = email;
        this.lastLoginAt = lastLoginAt;
    }

    public String getToken() {
        return token;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }
}
