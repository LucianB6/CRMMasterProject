package com.salesway.auth.dto;

import java.util.UUID;

public class CurrentUserResponse {
    private final UUID userId;
    private final String email;
    private final String firstName;
    private final String lastName;

    public CurrentUserResponse(UUID userId, String email, String firstName, String lastName) {
        this.userId = userId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }
}
