package com.salesway.leads.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.leads.dto.LeadQuestionRequest;
import com.salesway.leads.entity.LeadForm;
import com.salesway.leads.entity.LeadFormQuestion;
import com.salesway.leads.repository.LeadFormQuestionRepository;
import com.salesway.leads.repository.LeadFormRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LeadFormServiceTest {

    @Mock
    private LeadFormRepository leadFormRepository;
    @Mock
    private LeadFormQuestionRepository questionRepository;
    @Mock
    private ManagerAccessService managerAccessService;
    @Mock
    private CompanyRepository companyRepository;

    private LeadFormService leadFormService;

    private LeadForm form;

    @BeforeEach
    void setUp() {
        leadFormService = new LeadFormService(
                leadFormRepository,
                questionRepository,
                managerAccessService,
                companyRepository,
                new ObjectMapper()
        );

        Company company = new Company();
        company.setId(UUID.randomUUID());

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(company);

        form = new LeadForm();
        form.setId(UUID.randomUUID());
        form.setCompany(company);

        when(managerAccessService.getManagerMembership()).thenReturn(membership);
        when(leadFormRepository.findByCompanyId(company.getId())).thenReturn(Optional.of(form));
        when(questionRepository.save(any(LeadFormQuestion.class))).thenAnswer(invocation -> {
            LeadFormQuestion question = invocation.getArgument(0);
            if (question.getId() == null) {
                question.setId(UUID.randomUUID());
            }
            return question;
        });
    }

    @Test
    void createQuestion_textAlias_mapsToShortTextAndIgnoresOptions() {
        LeadQuestionRequest request = baseRequest("TEXT");
        request.setOptionsJson(null);

        var response = leadFormService.addQuestion(request);

        ArgumentCaptor<LeadFormQuestion> captor = ArgumentCaptor.forClass(LeadFormQuestion.class);
        verify(questionRepository).save(captor.capture());

        assertThat(captor.getValue().getQuestionType()).isEqualTo("short_text");
        assertThat(captor.getValue().getOptionsJson()).isNull();
        assertThat(response.questionType()).isEqualTo("short_text");
        assertThat(response.optionsJson()).isNull();
    }

    @Test
    void createQuestion_selectWithValidOptions_persistsJsonArray() {
        LeadQuestionRequest request = baseRequest("SELECT");
        request.setOptionsJson("[\"Optiunea 1\",\"Optiunea 2\"]");

        var response = leadFormService.addQuestion(request);

        ArgumentCaptor<LeadFormQuestion> captor = ArgumentCaptor.forClass(LeadFormQuestion.class);
        verify(questionRepository).save(captor.capture());
        JsonNode options = captor.getValue().getOptionsJson();

        assertThat(captor.getValue().getQuestionType()).isEqualTo("single_select");
        assertThat(options).isNotNull();
        assertThat(options.isArray()).isTrue();
        assertThat(response.optionsJson()).isEqualTo("[\"Optiunea 1\",\"Optiunea 2\"]");
    }

    @Test
    void createQuestion_invalidQuestionType_returnsBadRequest() {
        LeadQuestionRequest request = baseRequest("TEXTX");

        assertThatThrownBy(() -> leadFormService.addQuestion(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("questionType invalid");
                });
    }

    @Test
    void createQuestion_invalidOptionsJson_returnsBadRequest() {
        LeadQuestionRequest request = baseRequest("MULTI_SELECT");
        request.setOptionsJson("{invalid}");

        assertThatThrownBy(() -> leadFormService.addQuestion(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("optionsJson invalid JSON");
                });
    }

    @Test
    void updateQuestion_invalidOptionsJson_returnsBadRequest() {
        UUID questionId = UUID.randomUUID();
        LeadFormQuestion existing = new LeadFormQuestion();
        existing.setId(questionId);
        existing.setLeadForm(form);

        when(questionRepository.findByIdAndLeadFormId(questionId, form.getId())).thenReturn(Optional.of(existing));

        LeadQuestionRequest request = baseRequest("SELECT");
        request.setOptionsJson("not-json");

        assertThatThrownBy(() -> leadFormService.updateQuestion(questionId, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("optionsJson invalid JSON");
                });
    }

    private LeadQuestionRequest baseRequest(String type) {
        LeadQuestionRequest request = new LeadQuestionRequest();
        request.setQuestionType(type);
        request.setLabel("Label");
        request.setRequired(true);
        request.setDisplayOrder(1);
        request.setPlaceholder(null);
        request.setHelpText(null);
        return request;
    }
}
