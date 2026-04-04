package com.salesway.billing.dto;

import java.time.Instant;

public record BillingCurrentPlanResponse(
        String planCode,
        String subscriptionStatus,
        Instant currentPeriodEnd,
        Integer includedSeats,
        Integer aiAssistantLimit,
        Integer aiInsightsLimit
) {
}
