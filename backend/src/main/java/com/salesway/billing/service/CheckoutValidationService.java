package com.salesway.billing.service;

import com.salesway.auth.repository.UserRepository;
import com.salesway.billing.dto.CheckoutValidationRequest;
import com.salesway.billing.dto.CheckoutValidationResponse;
import com.salesway.common.error.FieldValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class CheckoutValidationService {
    private static final Logger log = LoggerFactory.getLogger(CheckoutValidationService.class);

    private final UserRepository userRepository;
    private final PlanCatalogService planCatalogService;

    public CheckoutValidationService(
            UserRepository userRepository,
            StripeCatalogService stripeCatalogService,
            PlanCatalogService planCatalogService
    ) {
        this.userRepository = userRepository;
        this.planCatalogService = planCatalogService;
    }

    public CheckoutValidationResponse validate(CheckoutValidationRequest request) {
        List<Map<String, String>> fieldErrors = new ArrayList<>();

        String plan = trimToNull(request.getPlan());
        String lookupKey = trimToNull(request.getLookupKey());
        String requestedPlan = plan == null ? lookupKey : plan;
        String requestedPlanField = plan == null ? "lookup_key" : "plan";
        String email = trimToNull(request.getEmail());
        String password = request.getPassword();
        String retypePassword = request.getRetypePassword();
        String firstName = trimToNull(request.getFirstName());
        String lastName = trimToNull(request.getLastName());
        String companyName = trimToNull(request.getCompanyName());

        if (requestedPlan == null) {
            fieldErrors.add(fieldError("plan", "plan is required"));
        } else if (!requestedPlan.matches("^[A-Za-z0-9._:-]+$")) {
            fieldErrors.add(fieldError(requestedPlanField, requestedPlanField + " contains invalid characters"));
        } else {
            try {
                planCatalogService.resolveCheckoutPlan(requestedPlan);
            } catch (RuntimeException exception) {
                fieldErrors.add(fieldError(requestedPlanField, requestedPlanField + " is invalid"));
            }
        }

        if (email == null) {
            fieldErrors.add(fieldError("email", "email is required"));
        } else if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            fieldErrors.add(fieldError("email", "email must be valid"));
        } else if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new FieldValidationException(
                    HttpStatus.CONFLICT,
                    "Validation failed",
                    List.of(fieldError("email", "Email already in use"))
            );
        }

        if (password == null || password.isBlank()) {
            fieldErrors.add(fieldError("password", "password is required"));
        } else if (password.length() < 8) {
            fieldErrors.add(fieldError("password", "password must be at least 8 characters"));
        }

        if (retypePassword == null || retypePassword.isBlank()) {
            fieldErrors.add(fieldError("retype_password", "retype_password is required"));
        } else if (password != null && !password.isBlank() && !password.equals(retypePassword)) {
            fieldErrors.add(fieldError("retype_password", "Passwords do not match"));
        }

        if (firstName == null) {
            fieldErrors.add(fieldError("first_name", "first_name is required"));
        }

        if (lastName == null) {
            fieldErrors.add(fieldError("last_name", "last_name is required"));
        }

        if (companyName == null) {
            fieldErrors.add(fieldError("company_name", "company_name is required"));
        }

        if (!fieldErrors.isEmpty()) {
            log.info("event=validation_failed fields={}", fieldErrors.stream().map(error -> error.get("field")).toList());
            throw new FieldValidationException(HttpStatus.BAD_REQUEST, "Validation failed", fieldErrors);
        }

        return new CheckoutValidationResponse("Validation passed", List.of());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Map<String, String> fieldError(String field, String message) {
        return Map.of("field", field, "message", message);
    }
}
