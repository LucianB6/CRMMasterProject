package com.salesway.billing.dto;

import java.time.Instant;

public record ReactivateSubscriptionResponse(
        String message,
        String subscriptionStatus,
        Instant currentPeriodEnd
) {
}
