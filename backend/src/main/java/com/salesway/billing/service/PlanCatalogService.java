package com.salesway.billing.service;

import com.salesway.billing.entity.UsageType;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;

@Service
public class PlanCatalogService {
    public PlanDefinition getPlan(String rawPlanCode) {
        String planCode = rawPlanCode == null || rawPlanCode.isBlank()
                ? "STARTER"
                : rawPlanCode.trim().toUpperCase(Locale.ROOT);
        return switch (planCode) {
            case "GROWTH" -> new PlanDefinition("GROWTH", 10, Map.of(
                    UsageType.AI_ASSISTANT, 2000,
                    UsageType.AI_INSIGHTS, 1000
            ));
            case "ENTERPRISE" -> new PlanDefinition("ENTERPRISE", 100, Map.of(
                    UsageType.AI_ASSISTANT, 10000,
                    UsageType.AI_INSIGHTS, 5000
            ));
            default -> new PlanDefinition("STARTER", 3, Map.of(
                    UsageType.AI_ASSISTANT, 500,
                    UsageType.AI_INSIGHTS, 250
            ));
        };
    }

    public int getLimit(String planCode, UsageType usageType) {
        return getPlan(planCode).usageLimits().getOrDefault(usageType, 0);
    }

    public record PlanDefinition(
            String planCode,
            int includedSeats,
            Map<UsageType, Integer> usageLimits
    ) {
    }
}
