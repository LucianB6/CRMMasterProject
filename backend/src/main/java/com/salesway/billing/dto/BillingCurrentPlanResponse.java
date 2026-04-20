package com.salesway.billing.dto;

import java.time.Instant;

public record BillingCurrentPlanResponse(
        String planCode,
        String subscriptionStatus,
        Instant currentPeriodEnd,
        Instant cancelledAt,
        Instant graceUntil,
        Instant leadsDeactivatedAt,
        Integer includedSeats,
        Integer aiAssistantLimit,
        Integer aiInsightsLimit
) {
}
