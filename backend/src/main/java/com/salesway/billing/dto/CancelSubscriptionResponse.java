package com.salesway.billing.dto;

import java.time.Instant;

public record CancelSubscriptionResponse(
        String message,
        String subscriptionStatus,
        Instant cancelledAt,
        Instant graceUntil
) {
}
