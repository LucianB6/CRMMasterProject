package com.salesway.common.error;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
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


        if (message != null && message.contains("SQLState: 42804")
                && message.contains("answer_value")
                && message.contains("jsonb")
                && message.contains("character varying")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "answers[].value invalid JSON type for jsonb persistence"
            ));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Data integrity violation"
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "message", exception.getMessage() == null ? "Invalid request parameter" : exception.getMessage()
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        String parameter = exception.getName() == null ? "parameter" : exception.getName();
        return ResponseEntity.badRequest().body(Map.of(
                "message", "invalid parameter type: " + parameter
        ));
    }
}
