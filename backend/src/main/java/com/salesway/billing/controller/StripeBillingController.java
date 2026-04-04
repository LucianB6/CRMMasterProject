package com.salesway.billing.controller;

import com.salesway.billing.dto.CreateCheckoutSessionRequest;
import com.salesway.billing.dto.CreatePortalSessionRequest;
import com.salesway.billing.service.StripeBillingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
public class StripeBillingController {
    private final StripeBillingService stripeBillingService;

    public StripeBillingController(StripeBillingService stripeBillingService) {
        this.stripeBillingService = stripeBillingService;
    }

    @PostMapping(path = {"/create-checkout-session", "/create-checkout-session/"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> createCheckoutSessionJson(
            @Valid @RequestBody CreateCheckoutSessionRequest request
    ) {
        return redirectTo(stripeBillingService.createCheckoutSession(request));
    }

    @PostMapping(path = {"/create-checkout-session", "/create-checkout-session/"}, consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> createCheckoutSessionForm(
            @RequestParam MultiValueMap<String, String> formData
    ) {
        return redirectTo(stripeBillingService.createCheckoutSession(fromForm(formData)));
    }

    @PostMapping(path = {"/create-portal-session", "/create-portal-session/"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> createPortalSessionJson(
            @Valid @RequestBody CreatePortalSessionRequest request
    ) {
        return redirectTo(stripeBillingService.createPortalSession(request.getSessionId()));
    }

    @PostMapping(path = {"/create-portal-session", "/create-portal-session/"}, consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> createPortalSessionForm(
            @RequestParam("session_id") String sessionId
    ) {
        return redirectTo(stripeBillingService.createPortalSession(sessionId));
    }

    @PostMapping(path = {"/webhook", "/webhook/"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> handleWebhook(
            @RequestHeader(name = "Stripe-Signature") String stripeSignature,
            @RequestBody String payload
    ) {
        stripeBillingService.handleWebhook(payload, stripeSignature);
        return ResponseEntity.ok().build();
    }

    private ResponseEntity<Void> redirectTo(URI uri) {
        return ResponseEntity.status(HttpStatus.SEE_OTHER)
                .header(HttpHeaders.LOCATION, uri.toString())
                .build();
    }

    private CreateCheckoutSessionRequest fromForm(MultiValueMap<String, String> formData) {
        CreateCheckoutSessionRequest request = new CreateCheckoutSessionRequest();
        request.setLookupKey(formData.getFirst("lookup_key"));
        request.setEmail(formData.getFirst("email"));
        request.setPassword(formData.getFirst("password"));
        request.setRetypePassword(firstNonBlank(formData, "retype_password", "confirm_password"));
        request.setFirstName(firstNonBlank(formData, "first_name", "firstName"));
        request.setLastName(firstNonBlank(formData, "last_name", "lastName"));
        request.setCompanyName(firstNonBlank(formData, "company_name", "companyName"));
        return request;
    }

    private String firstNonBlank(MultiValueMap<String, String> formData, String primaryKey, String fallbackKey) {
        String primaryValue = formData.getFirst(primaryKey);
        if (primaryValue != null && !primaryValue.isBlank()) {
            return primaryValue;
        }
        return formData.getFirst(fallbackKey);
    }
}
