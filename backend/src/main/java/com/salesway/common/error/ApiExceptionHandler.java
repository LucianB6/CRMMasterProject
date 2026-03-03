package com.salesway.common.error;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException exception) {
        String message = exception.getMostSpecificCause() != null
                ? exception.getMostSpecificCause().getMessage()
                : exception.getMessage();

        if (message != null && message.contains("SQLState: 23514") && message.contains("chk_lead_form_questions_type")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "questionType invalid; allowed: TEXT, SHORT_TEXT, LONG_TEXT, SELECT, SINGLE_SELECT, MULTI_SELECT, NUMBER, DATE, BOOLEAN",
                    "fieldErrors", List.of()
            ));
        }


        if (message != null && message.contains("SQLState: 42804")
                && message.contains("answer_value")
                && message.contains("jsonb")
                && message.contains("character varying")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "answers[].value invalid JSON type for jsonb persistence",
                    "fieldErrors", List.of()
            ));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Data integrity violation",
                "fieldErrors", List.of()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "message", exception.getMessage() == null ? "Invalid request parameter" : exception.getMessage(),
                "fieldErrors", List.of()
        ));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
        String parameter = exception.getName() == null ? "parameter" : exception.getName();
        return ResponseEntity.badRequest().body(Map.of(
                "message", "invalid parameter type: " + parameter,
                "fieldErrors", List.of()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
        List<Map<String, String>> fieldErrors = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::toFieldError)
                .toList();
        return ResponseEntity.badRequest().body(Map.of(
                "message", "Validation failed",
                "fieldErrors", fieldErrors
        ));
    }

    private Map<String, String> toFieldError(FieldError error) {
        Map<String, String> fieldError = new LinkedHashMap<>();
        fieldError.put("field", error.getField());
        fieldError.put("message", error.getDefaultMessage() == null ? "invalid value" : error.getDefaultMessage());
        return fieldError;
    }
}
