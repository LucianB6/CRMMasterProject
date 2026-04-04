package com.salesway.billing.dto;

public record BillingUsageItemResponse(
        String usageType,
        int used,
        int limit,
        int remaining
) {
}
