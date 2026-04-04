package com.salesway.common.error;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class FieldValidationException extends RuntimeException {
    private final HttpStatus status;
    private final List<Map<String, String>> fieldErrors;

    public FieldValidationException(HttpStatus status, String message, List<Map<String, String>> fieldErrors) {
        super(message);
        this.status = status;
        this.fieldErrors = fieldErrors;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public List<Map<String, String>> getFieldErrors() {
        return fieldErrors;
    }
}
