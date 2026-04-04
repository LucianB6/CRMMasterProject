package com.salesway.auth.dto;

import java.time.Instant;
import java.util.UUID;

public class CurrentUserResponse {
    private final UUID userId;
    private final String email;
    private final String firstName;
    private final String lastName;
    private final String companyName;
    private final String planCode;
    private final String subscriptionStatus;
    private final Instant subscriptionCurrentPeriodEnd;

    public CurrentUserResponse(
            UUID userId,
            String email,
            String firstName,
            String lastName,
            String companyName,
            String planCode,
            String subscriptionStatus,
            Instant subscriptionCurrentPeriodEnd
    ) {
        this.userId = userId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.companyName = companyName;
        this.planCode = planCode;
        this.subscriptionStatus = subscriptionStatus;
        this.subscriptionCurrentPeriodEnd = subscriptionCurrentPeriodEnd;
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

    public String getCompanyName() {
        return companyName;
    }

    public String getPlanCode() {
        return planCode;
    }

    public String getSubscriptionStatus() {
        return subscriptionStatus;
    }

    public Instant getSubscriptionCurrentPeriodEnd() {
        return subscriptionCurrentPeriodEnd;
    }
}
