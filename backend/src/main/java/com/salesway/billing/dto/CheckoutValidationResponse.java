package com.salesway.billing.dto;

import java.util.List;
import java.util.Map;

public class CheckoutValidationResponse {
    private final String message;
    private final List<Map<String, String>> fieldErrors;

    public CheckoutValidationResponse(String message, List<Map<String, String>> fieldErrors) {
        this.message = message;
        this.fieldErrors = fieldErrors;
    }

    public String getMessage() {
        return message;
    }

    public List<Map<String, String>> getFieldErrors() {
        return fieldErrors;
    }
}
