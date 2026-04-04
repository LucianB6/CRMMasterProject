package com.salesway.billing.controller;

import com.salesway.billing.dto.BillingCurrentPlanResponse;
import com.salesway.billing.dto.BillingEntitlementsResponse;
import com.salesway.billing.dto.BillingUsageResponse;
import com.salesway.billing.service.BillingUsageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/billing")
public class BillingController {
    private final BillingUsageService billingUsageService;

    public BillingController(BillingUsageService billingUsageService) {
        this.billingUsageService = billingUsageService;
    }

    @GetMapping("/current-plan")
    public ResponseEntity<BillingCurrentPlanResponse> currentPlan() {
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
}
