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
import org.mockito.InjectMocks;
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

    @InjectMocks
    private LeadFormService leadFormService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private LeadForm form;

    @BeforeEach
    void setUp() {
        leadFormService = new LeadFormService(
                leadFormRepository,
                questionRepository,
                managerAccessService,
                companyRepository,
                objectMapper
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
    }

    @Test
    void addQuestion_withNullOptionsJson_persistsNullJsonb() {
        when(questionRepository.save(any(LeadFormQuestion.class))).thenAnswer(invocation -> {
            LeadFormQuestion question = invocation.getArgument(0);
            question.setId(UUID.randomUUID());
            return question;
        });

        LeadQuestionRequest request = baseRequest();
        request.setOptionsJson(null);

        var response = leadFormService.addQuestion(request);

        ArgumentCaptor<LeadFormQuestion> captor = ArgumentCaptor.forClass(LeadFormQuestion.class);
        verify(questionRepository).save(captor.capture());
        assertThat(captor.getValue().getOptionsJson()).isNull();
        assertThat(response.optionsJson()).isNull();
    }

    @Test
    void addQuestion_withValidOptionsJson_parsesAndPersistsJsonb() {
        when(questionRepository.save(any(LeadFormQuestion.class))).thenAnswer(invocation -> {
            LeadFormQuestion question = invocation.getArgument(0);
            question.setId(UUID.randomUUID());
            return question;
        });

        LeadQuestionRequest request = baseRequest();
        request.setOptionsJson("[\"B2B\",\"B2C\"]");

        var response = leadFormService.addQuestion(request);

        ArgumentCaptor<LeadFormQuestion> captor = ArgumentCaptor.forClass(LeadFormQuestion.class);
        verify(questionRepository).save(captor.capture());
        JsonNode persisted = captor.getValue().getOptionsJson();

        assertThat(persisted).isNotNull();
        assertThat(persisted.isArray()).isTrue();
        assertThat(response.optionsJson()).isEqualTo("[\"B2B\",\"B2C\"]");
    }

    @Test
    void addQuestion_withInvalidOptionsJson_returnsBadRequest() {
        LeadQuestionRequest request = baseRequest();
        request.setOptionsJson("{invalid json}");

        assertThatThrownBy(() -> leadFormService.addQuestion(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException responseException = (ResponseStatusException) ex;
                    assertThat(responseException.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(responseException.getReason()).contains("optionsJson invalid json");
                });
    }

    @Test
    void updateQuestion_withValidOptionsJson_updatesJsonb() {
        UUID questionId = UUID.randomUUID();
        LeadFormQuestion existing = new LeadFormQuestion();
        existing.setId(questionId);
        existing.setLeadForm(form);

        when(questionRepository.findByIdAndLeadFormId(questionId, form.getId())).thenReturn(Optional.of(existing));
        when(questionRepository.save(any(LeadFormQuestion.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LeadQuestionRequest request = baseRequest();
        request.setOptionsJson("{\"choices\":[\"a\",\"b\"]}");

        var response = leadFormService.updateQuestion(questionId, request);

        assertThat(response.optionsJson()).isEqualTo("{\"choices\":[\"a\",\"b\"]}");
    }

    @Test
    void updateQuestion_withInvalidOptionsJson_returnsBadRequest() {
        UUID questionId = UUID.randomUUID();
        LeadFormQuestion existing = new LeadFormQuestion();
        existing.setId(questionId);
        existing.setLeadForm(form);

        when(questionRepository.findByIdAndLeadFormId(questionId, form.getId())).thenReturn(Optional.of(existing));

        LeadQuestionRequest request = baseRequest();
        request.setOptionsJson("not-json");

        assertThatThrownBy(() -> leadFormService.updateQuestion(questionId, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException responseException = (ResponseStatusException) ex;
                    assertThat(responseException.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(responseException.getReason()).contains("optionsJson invalid json");
                });
    }

    private LeadQuestionRequest baseRequest() {
        LeadQuestionRequest request = new LeadQuestionRequest();
        request.setQuestionType("single_select");
        request.setLabel("Tip business");
        request.setRequired(true);
        request.setDisplayOrder(1);
        request.setPlaceholder(null);
        request.setHelpText(null);
        return request;
    }
}
