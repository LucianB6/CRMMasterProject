package com.salesway.billing.controller;

import com.salesway.billing.dto.CancelSubscriptionResponse;
import com.salesway.billing.dto.ReactivateSubscriptionResponse;
import com.salesway.billing.service.BillingUsageService;
import com.salesway.billing.service.StripeBillingService;
import com.salesway.common.error.ApiExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BillingControllerTest {
    private BillingUsageService billingUsageService;
    private StripeBillingService stripeBillingService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        billingUsageService = Mockito.mock(BillingUsageService.class);
        stripeBillingService = Mockito.mock(StripeBillingService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new BillingController(billingUsageService, stripeBillingService))
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void cancelSubscriptionReturnsGraceWindow() throws Exception {
        Instant cancelledAt = Instant.parse("2026-04-15T07:30:00Z");
        Instant graceUntil = Instant.parse("2026-05-15T07:30:00Z");
        when(stripeBillingService.cancelCurrentSubscription())
                .thenReturn(new CancelSubscriptionResponse("Subscription canceled", "canceled", cancelledAt, graceUntil));

        mockMvc.perform(post("/billing/subscription/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subscriptionStatus").value("canceled"))
                .andExpect(jsonPath("$.graceUntil").exists());

        verify(stripeBillingService).cancelCurrentSubscription();
    }

    @Test
    void reactivateSubscriptionReturnsCurrentPeriod() throws Exception {
        Instant currentPeriodEnd = Instant.parse("2026-05-01T00:00:00Z");
        when(stripeBillingService.reactivateCurrentSubscription())
                .thenReturn(new ReactivateSubscriptionResponse("Subscription reactivated", "active", currentPeriodEnd));

        mockMvc.perform(post("/billing/subscription/reactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subscriptionStatus").value("active"))
                .andExpect(jsonPath("$.currentPeriodEnd").exists());

        verify(stripeBillingService).reactivateCurrentSubscription();
    }
}
