package com.salesway.billing.service;

import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.billing.dto.CheckoutValidationRequest;
import com.salesway.common.error.FieldValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CheckoutValidationServiceTest {
    private UserRepository userRepository;
    private StripeCatalogService stripeCatalogService;
    private PlanCatalogService planCatalogService;
    private CheckoutValidationService checkoutValidationService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        stripeCatalogService = mock(StripeCatalogService.class);
        planCatalogService = mock(PlanCatalogService.class);
        checkoutValidationService = new CheckoutValidationService(userRepository, stripeCatalogService, planCatalogService);
    }

    @Test
    void returnsSuccessForValidData() {
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.empty());
        when(planCatalogService.resolveCheckoutPlan("starter")).thenReturn(checkoutPlan("starter", "STARTER", "starter_monthly", "price_starter"));

        var response = checkoutValidationService.validate(request());

        assertThat(response.getMessage()).isEqualTo("Validation passed");
        assertThat(response.getFieldErrors()).isEmpty();
    }

    @Test
    void returnsConflictForExistingEmail() {
        User existingUser = new User();
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.of(existingUser));
        when(planCatalogService.resolveCheckoutPlan("starter")).thenReturn(checkoutPlan("starter", "STARTER", "starter_monthly", "price_starter"));

        assertThatThrownBy(() -> checkoutValidationService.validate(request()))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(exception -> {
                    FieldValidationException validationException = (FieldValidationException) exception;
                    assertThat(validationException.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(validationException.getFieldErrors())
                            .containsExactly(java.util.Map.of("field", "email", "message", "Email already in use"));
                });
    }

    @Test
    void returnsBadRequestForPasswordMismatch() {
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.empty());
        when(planCatalogService.resolveCheckoutPlan("starter")).thenReturn(checkoutPlan("starter", "STARTER", "starter_monthly", "price_starter"));

        CheckoutValidationRequest request = request();
        request.setRetypePassword("Mismatch123");

        assertThatThrownBy(() -> checkoutValidationService.validate(request))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(exception -> {
                    FieldValidationException validationException = (FieldValidationException) exception;
                    assertThat(validationException.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(validationException.getFieldErrors())
                            .contains(java.util.Map.of("field", "retype_password", "message", "Passwords do not match"));
                });
    }

    @Test
    void returnsBadRequestForMissingFields() {
        CheckoutValidationRequest request = new CheckoutValidationRequest();

        assertThatThrownBy(() -> checkoutValidationService.validate(request))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(exception -> {
                    FieldValidationException validationException = (FieldValidationException) exception;
                    assertThat(validationException.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(validationException.getFieldErrors()).hasSize(7);
                });
    }

    @Test
    void returnsBadRequestForInvalidPlan() {
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Optional.empty());
        when(planCatalogService.resolveCheckoutPlan("starter"))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan is invalid"));

        assertThatThrownBy(() -> checkoutValidationService.validate(request()))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(exception -> {
                    FieldValidationException validationException = (FieldValidationException) exception;
                    assertThat(validationException.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(validationException.getFieldErrors())
                            .contains(java.util.Map.of("field", "plan", "message", "plan is invalid"));
                });
    }

    private PlanCatalogService.CheckoutPlan checkoutPlan(String plan, String planCode, String lookupKey, String priceId) {
        return new PlanCatalogService.CheckoutPlan(plan, planCode, lookupKey, priceId);
    }

    private CheckoutValidationRequest request() {
        CheckoutValidationRequest request = new CheckoutValidationRequest();
        request.setPlan("starter");
        request.setEmail("test@example.com");
        request.setPassword("Password123");
        request.setRetypePassword("Password123");
        request.setFirstName("John");
        request.setLastName("Doe");
        request.setCompanyName("Acme");
        return request;
    }
}
