package com.salesway.billing.service;

import com.salesway.billing.entity.UsageType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;

@Service
public class PlanCatalogService {
    private static final Map<String, String> LOOKUP_KEY_PLAN_CODES = Map.of(
            "starter_monthly", "STARTER",
            "pro_monthly", "PRO",
            "enterprise_monthly", "ENTERPRISE"
    );

    public PlanDefinition getPlan(String rawPlanCode) {
        String planCode = rawPlanCode == null || rawPlanCode.isBlank()
                ? "STARTER"
                : rawPlanCode.trim().toUpperCase(Locale.ROOT);
        return switch (planCode) {
            case "PRO", "GROWTH" -> new PlanDefinition("PRO", 10, Map.of(
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

    public String resolvePlanCodeForLookupKey(String rawLookupKey) {
        if (rawLookupKey == null || rawLookupKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lookup_key is required");
        }
        String lookupKey = rawLookupKey.trim().toLowerCase(Locale.ROOT);
        String planCode = LOOKUP_KEY_PLAN_CODES.get(lookupKey);
        if (planCode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lookup_key is invalid");
        }
        return planCode;
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
