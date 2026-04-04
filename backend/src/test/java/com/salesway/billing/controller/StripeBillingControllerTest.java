package com.salesway.billing.controller;

import com.salesway.billing.service.StripeBillingService;
import com.salesway.common.error.ApiExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.net.URI;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StripeBillingControllerTest {
    private StripeBillingService stripeBillingService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        stripeBillingService = Mockito.mock(StripeBillingService.class);

        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(new StripeBillingController(stripeBillingService))
                .setControllerAdvice(new ApiExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void createCheckoutSessionJsonRedirectsWith303() throws Exception {
        when(stripeBillingService.createCheckoutSession(any()))
                .thenReturn(URI.create("https://checkout.stripe.com/c/pay/cs_test_123"));

        mockMvc.perform(post("/create-checkout-session")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"lookup_key":"starter","email":"ana@example.com","password":"Test1234","retype_password":"Test1234","firstName":"Ana","lastName":"Pop","company_name":"Acme"}
                                """))
                .andExpect(status().isSeeOther())
                .andExpect(header().string("Location", "https://checkout.stripe.com/c/pay/cs_test_123"));

        verify(stripeBillingService).createCheckoutSession(any());
    }

    @Test
    void createPortalSessionFormRedirectsWith303() throws Exception {
        when(stripeBillingService.createPortalSession("cs_test_123"))
                .thenReturn(URI.create("https://billing.stripe.com/p/session/test_123"));

        mockMvc.perform(post("/create-portal-session")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("session_id", "cs_test_123"))
                .andExpect(status().isSeeOther())
                .andExpect(header().string("Location", "https://billing.stripe.com/p/session/test_123"));

        verify(stripeBillingService).createPortalSession(eq("cs_test_123"));
    }

    @Test
    void webhookReturns200() throws Exception {
        mockMvc.perform(post("/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", "t=1,v1=test")
                        .content("{}"))
                .andExpect(status().isOk());

        verify(stripeBillingService).handleWebhook(eq("{}"), eq("t=1,v1=test"));
    }
}
