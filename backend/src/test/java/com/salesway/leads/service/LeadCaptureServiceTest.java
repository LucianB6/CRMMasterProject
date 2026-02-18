package com.salesway.leads.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.companies.entity.Company;
import com.salesway.leads.dto.PublicLeadSubmitRequest;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAnswer;
import com.salesway.leads.entity.LeadForm;
import com.salesway.leads.entity.LeadFormQuestion;
import com.salesway.leads.repository.LeadAnswerRepository;
import com.salesway.leads.repository.LeadFormQuestionRepository;
import com.salesway.leads.repository.LeadFormRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.repository.LeadStandardFieldsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeadCaptureServiceTest {

    @Mock
    private LeadFormRepository leadFormRepository;
    @Mock
    private LeadFormQuestionRepository questionRepository;
    @Mock
    private LeadRepository leadRepository;
    @Mock
    private LeadStandardFieldsRepository standardFieldsRepository;
    @Mock
    private LeadAnswerRepository answerRepository;

    private LeadCaptureService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private LeadForm form;
    private LeadFormQuestion shortTextQuestion;
    private LeadFormQuestion singleSelectQuestion;

    @BeforeEach
    void setUp() {
        service = new LeadCaptureService(
                leadFormRepository,
                questionRepository,
                leadRepository,
                standardFieldsRepository,
                answerRepository,
                objectMapper
        );

        Company company = new Company();
        company.setId(UUID.randomUUID());

        form = new LeadForm();
        form.setId(UUID.randomUUID());
        form.setCompany(company);
        form.setPublicSlug("slug");
        form.setIsActive(true);

        shortTextQuestion = new LeadFormQuestion();
        shortTextQuestion.setId(UUID.randomUUID());
        shortTextQuestion.setLeadForm(form);
        shortTextQuestion.setQuestionType("short_text");
        shortTextQuestion.setLabel("Nume companie");
        shortTextQuestion.setRequired(true);
        shortTextQuestion.setDisplayOrder(1);

        singleSelectQuestion = new LeadFormQuestion();
        singleSelectQuestion.setId(UUID.randomUUID());
        singleSelectQuestion.setLeadForm(form);
        singleSelectQuestion.setQuestionType("single_select");
        singleSelectQuestion.setLabel("Canal");
        singleSelectQuestion.setRequired(true);
        singleSelectQuestion.setDisplayOrder(2);
        singleSelectQuestion.setOptionsJson(readJson("[\"Facebook\",\"Google\"]"));

        when(leadFormRepository.findByPublicSlugAndIsActiveTrue("slug")).thenReturn(Optional.of(form));
        when(leadRepository.save(any(Lead.class))).thenAnswer(invocation -> {
            Lead lead = invocation.getArgument(0);
            if (lead.getId() == null) {
                lead.setId(UUID.randomUUID());
            }
            if (lead.getSubmittedAt() == null) {
                lead.setSubmittedAt(Instant.now());
            }
            return lead;
        });
    }

    @Test
    void submitComplete_shortTextAndSingleSelect_success() {
        when(questionRepository.findByLeadFormIdAndIsActiveTrue(form.getId()))
                .thenReturn(List.of(shortTextQuestion, singleSelectQuestion));

        PublicLeadSubmitRequest request = baseRequest(List.of(
                answer(shortTextQuestion.getId(), "Acme SRL"),
                answer(singleSelectQuestion.getId(), "Facebook")
        ));

        var response = service.submitLead("slug", request);

        assertThat(response.leadId()).isNotNull();
        assertThat(response.status()).isEqualTo("new");

        ArgumentCaptor<LeadAnswer> answerCaptor = ArgumentCaptor.forClass(LeadAnswer.class);
        verify(answerRepository, atLeastOnce()).save(answerCaptor.capture());
        assertThat(answerCaptor.getValue().getAnswerValue().isTextual()).isTrue();

    }

    @Test
    void submitShortTextWithOptionsSet_dataInconsistentStillSuccess() {
        shortTextQuestion.setOptionsJson(readJson("[\"Opt1\",\"Opt2\"]"));
        when(questionRepository.findByLeadFormIdAndIsActiveTrue(form.getId()))
                .thenReturn(List.of(shortTextQuestion, singleSelectQuestion));

        PublicLeadSubmitRequest request = baseRequest(List.of(
                answer(shortTextQuestion.getId(), "Valoare text"),
                answer(singleSelectQuestion.getId(), "Google")
        ));

        var response = service.submitLead("slug", request);

        assertThat(response.leadId()).isNotNull();
        assertThat(response.status()).isEqualTo("new");
    }


    @Test
    void submitSelectWithInvalidOptionsJsonInQuestion_returnsBadRequest() {
        singleSelectQuestion.setOptionsJson(objectMapper.getNodeFactory().textNode("not-json"));
        when(questionRepository.findByLeadFormIdAndIsActiveTrue(form.getId()))
                .thenReturn(List.of(shortTextQuestion, singleSelectQuestion));

        PublicLeadSubmitRequest request = baseRequest(List.of(
                answer(shortTextQuestion.getId(), "Acme SRL"),
                answer(singleSelectQuestion.getId(), "Facebook")
        ));

        assertThatThrownBy(() -> service.submitLead("slug", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("optionsJson invalid JSON");
                });
    }

    @Test
    void submitSingleSelectWithInvalidValue_returnsBadRequest() {
        when(questionRepository.findByLeadFormIdAndIsActiveTrue(form.getId()))
                .thenReturn(List.of(shortTextQuestion, singleSelectQuestion));

        PublicLeadSubmitRequest request = baseRequest(List.of(
                answer(shortTextQuestion.getId(), "Acme SRL"),
                answer(singleSelectQuestion.getId(), "TikTok")
        ));

        assertThatThrownBy(() -> service.submitLead("slug", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("not in options");
                });
    }

    @Test
    void submitMissingRequiredAnswers_returnsBadRequestWithIds() {
        when(questionRepository.findByLeadFormIdAndIsActiveTrue(form.getId()))
                .thenReturn(List.of(shortTextQuestion, singleSelectQuestion));

        PublicLeadSubmitRequest request = baseRequest(List.of(
                answer(shortTextQuestion.getId(), "Acme SRL")
        ));

        assertThatThrownBy(() -> service.submitLead("slug", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("missing required questionIds");
                    assertThat(rse.getReason()).contains(singleSelectQuestion.getId().toString());
                });
    }

    private PublicLeadSubmitRequest baseRequest(List<PublicLeadSubmitRequest.Answer> answers) {
        PublicLeadSubmitRequest request = new PublicLeadSubmitRequest();
        PublicLeadSubmitRequest.Standard standard = new PublicLeadSubmitRequest.Standard();
        standard.setFirstName("Ana");
        standard.setLastName("Popescu");
        standard.setEmail("ana@example.com");
        standard.setPhone("+40740111222");
        request.setStandard(standard);
        request.setAnswers(answers);
        return request;
    }

    private PublicLeadSubmitRequest.Answer answer(UUID questionId, String jsonLiteral) {
        PublicLeadSubmitRequest.Answer answer = new PublicLeadSubmitRequest.Answer();
        answer.setQuestionId(questionId);
        answer.setValue(readJsonValue(jsonLiteral));
        return answer;
    }

    private JsonNode readJson(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private JsonNode readJsonValue(String textValue) {
        return objectMapper.getNodeFactory().textNode(textValue);
    }
}
