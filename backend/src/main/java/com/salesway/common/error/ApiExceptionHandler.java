package com.salesway.common.error;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation(DataIntegrityViolationException exception) {
        String message = exception.getMostSpecificCause() != null
                ? exception.getMostSpecificCause().getMessage()
                : exception.getMessage();

        if (message != null && message.contains("SQLState: 23514") && message.contains("chk_lead_form_questions_type")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "questionType invalid; allowed: TEXT, SHORT_TEXT, LONG_TEXT, SELECT, SINGLE_SELECT, MULTI_SELECT, NUMBER, DATE, BOOLEAN"
            ));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Data integrity violation"
        ));
    }
}
