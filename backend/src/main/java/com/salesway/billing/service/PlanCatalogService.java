package com.salesway.billing.service;

import com.salesway.billing.config.StripeProperties;
import com.salesway.billing.entity.UsageType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;

@Service
public class PlanCatalogService {
    private static final String STARTER = "STARTER";
    private static final String PRO = "PRO";
    private static final String ENTERPRISE = "ENTERPRISE";

    private static final Map<String, String> LOOKUP_KEY_PLAN_CODES = Map.of(
            "starter_monthly", STARTER,
            "pro_monthly", PRO,
            "enterprise_monthly", ENTERPRISE
    );

    private final StripeProperties stripeProperties;

    public PlanCatalogService(StripeProperties stripeProperties) {
        this.stripeProperties = stripeProperties;
    }

    public PlanDefinition getPlan(String rawPlanCode) {
        String planCode = rawPlanCode == null || rawPlanCode.isBlank()
                ? STARTER
                : rawPlanCode.trim().toUpperCase(Locale.ROOT);
        return switch (planCode) {
            case "PRO", "GROWTH" -> new PlanDefinition(PRO, 10, Map.of(
                    UsageType.AI_ASSISTANT, 2000,
                    UsageType.AI_INSIGHTS, 1000
            ));
            case "ENTERPRISE" -> new PlanDefinition(ENTERPRISE, 100, Map.of(
                    UsageType.AI_ASSISTANT, 10000,
                    UsageType.AI_INSIGHTS, 5000
            ));
            default -> new PlanDefinition(STARTER, 3, Map.of(
                    UsageType.AI_ASSISTANT, 500,
                    UsageType.AI_INSIGHTS, 250
            ));
        };
    }

    public CheckoutPlan resolveCheckoutPlan(String rawPlan) {
        if (rawPlan == null || rawPlan.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan is required");
        }

        String normalized = rawPlan.trim().toLowerCase(Locale.ROOT);
        String planCode = switch (normalized) {
            case "starter", "starter_monthly" -> STARTER;
            case "pro", "pro_monthly" -> PRO;
            case "enterprise", "enterprise_monthly" -> ENTERPRISE;
            default -> LOOKUP_KEY_PLAN_CODES.get(normalized);
        };
        if (planCode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan is invalid");
        }

        String priceId = priceIdForPlanCode(planCode);
        if (priceId == null || priceId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Stripe price is not configured for plan");
        }

        return new CheckoutPlan(
                planCode.toLowerCase(Locale.ROOT),
                planCode,
                lookupKeyForPlanCode(planCode),
                priceId
        );
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

    private String priceIdForPlanCode(String planCode) {
        return switch (planCode) {
            case STARTER -> stripeProperties.getStarterPriceId();
            case PRO -> stripeProperties.getProPriceId();
            case ENTERPRISE -> stripeProperties.getEnterprisePriceId();
            default -> null;
        };
    }

    private String lookupKeyForPlanCode(String planCode) {
        return switch (planCode) {
            case STARTER -> "starter_monthly";
            case PRO -> "pro_monthly";
            case ENTERPRISE -> "enterprise_monthly";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan is invalid");
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

    public record CheckoutPlan(
            String plan,
            String planCode,
            String lookupKey,
            String priceId
    ) {
        public boolean isStarter() {
            return STARTER.equals(planCode);
        }
    }
}
