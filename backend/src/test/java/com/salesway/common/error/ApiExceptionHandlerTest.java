package com.salesway.common.error;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

class ApiExceptionHandlerTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void mapsQuestionTypeConstraintViolationToBadRequest() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "ERROR: SQLState: 23514, constraint chk_lead_form_questions_type"
        );

        var response = handler.handleDataIntegrityViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("message")).contains("questionType invalid");
    }


    @Test
    void mapsAnswerValueJsonbTypeMismatchToBadRequest() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "ERROR: SQLState: 42804, column answer_value is of type jsonb but expression is of type character varying"
        );

        var response = handler.handleDataIntegrityViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("message")).contains("answers[].value invalid JSON type");
    }

    @Test
    void keepsOtherIntegrityViolationsAsServerError() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("some other integrity issue");

        var response = handler.handleDataIntegrityViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
