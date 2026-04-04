package com.salesway.auth.controller;

import com.salesway.auth.service.AuthService;
import com.salesway.billing.dto.CheckoutValidationResponse;
import com.salesway.billing.service.CheckoutValidationService;
import com.salesway.billing.service.StripeBillingService;
import com.salesway.common.error.ApiExceptionHandler;
import com.salesway.common.error.FieldValidationException;
import com.salesway.manager.service.CompanyAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthCheckoutValidationControllerTest {
    private CheckoutValidationService checkoutValidationService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        checkoutValidationService = Mockito.mock(CheckoutValidationService.class);
        AuthService authService = Mockito.mock(AuthService.class);
        StripeBillingService stripeBillingService = Mockito.mock(StripeBillingService.class);
        CompanyAccessService companyAccessService = Mockito.mock(CompanyAccessService.class);

        mockMvc = MockMvcBuilders.standaloneSetup(
                        new AuthController(authService, stripeBillingService, checkoutValidationService, companyAccessService)
                )
                .setControllerAdvice(new ApiExceptionHandler())
                .build();
    }

    @Test
    void validateCheckoutReturnsOkJson() throws Exception {
        when(checkoutValidationService.validate(any()))
                .thenReturn(new CheckoutValidationResponse("Validation passed", List.of()));

        mockMvc.perform(get("/auth/checkout/validate")
                        .queryParam("lookup_key", "starter")
                        .queryParam("email", "test@example.com")
                        .queryParam("password", "Password123")
                        .queryParam("retype_password", "Password123")
                        .queryParam("first_name", "John")
                        .queryParam("last_name", "Doe")
                        .queryParam("company_name", "Acme"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Validation passed"))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    @Test
    void validateCheckoutReturnsConflictForExistingEmail() throws Exception {
        when(checkoutValidationService.validate(any()))
                .thenThrow(new FieldValidationException(
                        HttpStatus.CONFLICT,
                        "Validation failed",
                        List.of(Map.of("field", "email", "message", "Email already in use"))
                ));

        mockMvc.perform(get("/auth/checkout/validate").queryParam("email", "test@example.com"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("email"));
    }
}
