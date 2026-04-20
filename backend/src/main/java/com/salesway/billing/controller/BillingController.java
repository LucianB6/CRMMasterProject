package com.salesway.billing.controller;

import com.salesway.billing.dto.CancelSubscriptionResponse;
import com.salesway.billing.dto.ReactivateSubscriptionResponse;
import com.salesway.billing.dto.BillingCurrentPlanResponse;
import com.salesway.billing.dto.BillingEntitlementsResponse;
import com.salesway.billing.dto.BillingUsageResponse;
import com.salesway.billing.service.BillingUsageService;
import com.salesway.billing.service.StripeBillingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/billing")
public class BillingController {
    private final BillingUsageService billingUsageService;
    private final StripeBillingService stripeBillingService;

    public BillingController(BillingUsageService billingUsageService, StripeBillingService stripeBillingService) {
        this.billingUsageService = billingUsageService;
        this.stripeBillingService = stripeBillingService;
    }

    @GetMapping("/current-plan")
    public ResponseEntity<BillingCurrentPlanResponse> currentPlan() {
        stripeBillingService.syncCurrentSubscriptionSnapshotIfMissingPeriodEnd();
        return ResponseEntity.ok(billingUsageService.getCurrentPlan());
    }

    @GetMapping("/usage")
    public ResponseEntity<BillingUsageResponse> currentUsage() {
        return ResponseEntity.ok(billingUsageService.getCurrentUsage());
    }

    @GetMapping("/entitlements")
    public ResponseEntity<BillingEntitlementsResponse> entitlements() {
        return ResponseEntity.ok(billingUsageService.getEntitlements());
    }

    @PostMapping("/subscription/cancel")
    public ResponseEntity<CancelSubscriptionResponse> cancelSubscription() {
        return ResponseEntity.ok(stripeBillingService.cancelCurrentSubscription());
    }

    @PostMapping("/subscription/reactivate")
    public ResponseEntity<ReactivateSubscriptionResponse> reactivateSubscription() {
        return ResponseEntity.ok(stripeBillingService.reactivateCurrentSubscription());
    }
}
