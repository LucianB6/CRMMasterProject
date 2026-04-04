package com.salesway.billing.dto;

import java.time.LocalDate;
import java.util.List;

public record BillingUsageResponse(
        String planCode,
        LocalDate periodStart,
        List<BillingUsageItemResponse> usage
) {
}
