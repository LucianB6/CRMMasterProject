package com.salesway.leads.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.billing.service.BillingUsageService;
import com.salesway.chatbot.client.OpenAiClient;
import com.salesway.chatbot.entity.KbChunk;
import com.salesway.chatbot.entity.KbDocument;
import com.salesway.chatbot.repository.KbChunkRepository;
import com.salesway.chatbot.repository.KbDocumentRepository;
import com.salesway.companies.entity.Company;
import com.salesway.leads.dto.LeadAnswersUpdateRequest;
import com.salesway.leads.dto.LeadCallCreateRequest;
import com.salesway.leads.dto.LeadAiInsightFeedbackRequest;
import com.salesway.leads.dto.LeadAiInsightsResponse;
import com.salesway.leads.dto.LeadTaskCreateRequest;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAnswer;
import com.salesway.leads.entity.LeadAiInsightMemory;
import com.salesway.leads.entity.LeadAiInsightSnapshot;
import com.salesway.leads.entity.LeadEvent;
import com.salesway.leads.entity.LeadForm;
import com.salesway.leads.entity.LeadFormQuestion;
import com.salesway.leads.entity.LeadStandardFields;
import com.salesway.leads.enums.LeadEventType;
import com.salesway.leads.enums.LeadInsightFeedbackStatus;
import com.salesway.leads.repository.LeadAnswerRepository;
import com.salesway.leads.repository.LeadAiInsightMemoryRepository;
import com.salesway.leads.repository.LeadAiInsightSnapshotRepository;
import com.salesway.leads.repository.LeadCallLogRepository;
import com.salesway.leads.repository.LeadEventRepository;
import com.salesway.leads.repository.LeadFormQuestionRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.repository.LeadStandardFieldsRepository;
import com.salesway.manager.service.CompanyAccessService;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.tasks.repository.TaskBoardItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LeadDetailsServiceTest {

    private LeadRepository leadRepository;
    private LeadAnswerRepository leadAnswerRepository;
    private LeadAiInsightMemoryRepository leadAiInsightMemoryRepository;
    private LeadAiInsightSnapshotRepository leadAiInsightSnapshotRepository;
    private LeadEventRepository leadEventRepository;
    private LeadCallLogRepository leadCallLogRepository;
    private LeadStandardFieldsRepository leadStandardFieldsRepository;
    private LeadFormQuestionRepository leadFormQuestionRepository;
    private TaskBoardItemRepository taskBoardItemRepository;
    private CompanyMembershipRepository companyMembershipRepository;
    private LeadEventService leadEventService;
    private UserRepository userRepository;
    private KbDocumentRepository kbDocumentRepository;
    private KbChunkRepository kbChunkRepository;
    private OpenAiClient openAiClient;
    private LeadDetailsService leadDetailsService;
    private Lead lead;

    private UUID companyId;
    private UUID leadId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        leadRepository = mock(LeadRepository.class);
        leadAnswerRepository = mock(LeadAnswerRepository.class);
        leadAiInsightMemoryRepository = mock(LeadAiInsightMemoryRepository.class);
        leadAiInsightSnapshotRepository = mock(LeadAiInsightSnapshotRepository.class);
        leadEventRepository = mock(LeadEventRepository.class);
        leadCallLogRepository = mock(LeadCallLogRepository.class);
        leadStandardFieldsRepository = mock(LeadStandardFieldsRepository.class);
        leadFormQuestionRepository = mock(LeadFormQuestionRepository.class);
        taskBoardItemRepository = mock(TaskBoardItemRepository.class);
        companyMembershipRepository = mock(CompanyMembershipRepository.class);
        leadEventService = mock(LeadEventService.class);
        userRepository = mock(UserRepository.class);
        kbDocumentRepository = mock(KbDocumentRepository.class);
        kbChunkRepository = mock(KbChunkRepository.class);
        openAiClient = mock(OpenAiClient.class);
        BillingUsageService billingUsageService = mock(BillingUsageService.class);
        CompanyAccessService companyAccessService = mock(CompanyAccessService.class);
        ManagerAccessService managerAccessService = mock(ManagerAccessService.class);

        companyId = UUID.randomUUID();
        leadId = UUID.randomUUID();
        userId = UUID.randomUUID();

        Company company = new Company();
        company.setId(companyId);

        User user = new User();
        user.setId(userId);
        user.setEmail("manager@salesway.com");
        user.setFirstName("Ion");
        user.setLastName("Popescu");

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(company);
        membership.setUser(user);
        when(companyAccessService.getActiveMembership()).thenReturn(membership);
        when(managerAccessService.getManagerMembership()).thenReturn(membership);

        lead = new Lead();
        lead.setId(leadId);
        lead.setCompany(company);
        lead.setStatus("new");
        lead.setSubmittedAt(Instant.now());
        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));
        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of()));
        when(leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId))
                .thenReturn(List.of());
        when(leadAnswerRepository.findLatestCreatedAtByLeadId(leadId))
                .thenReturn(null);
        when(leadAiInsightMemoryRepository.findTop3ByLeadIdAndCompanyIdOrderByCreatedAtDesc(leadId, companyId))
                .thenReturn(List.of());
        when(leadAiInsightMemoryRepository.findLatestUpdatedAtByLeadIdAndCompanyId(leadId, companyId))
                .thenReturn(null);
        when(leadAiInsightSnapshotRepository.findByLeadIdAndCompanyId(leadId, companyId))
                .thenReturn(Optional.empty());
        when(leadAiInsightMemoryRepository.save(any())).thenAnswer(invocation -> {
            LeadAiInsightMemory memory = invocation.getArgument(0);
            memory.setId(UUID.randomUUID());
            return memory;
        });

        leadDetailsService = new LeadDetailsService(
                leadRepository,
                leadAnswerRepository,
                leadAiInsightMemoryRepository,
                leadAiInsightSnapshotRepository,
                leadEventRepository,
                leadCallLogRepository,
                leadStandardFieldsRepository,
                leadFormQuestionRepository,
                taskBoardItemRepository,
                companyMembershipRepository,
                companyAccessService,
                leadEventService,
                managerAccessService,
                userRepository,
                kbDocumentRepository,
                kbChunkRepository,
                openAiClient,
                new ObjectMapper(),
                billingUsageService
        );
    }

    @Test
    void getAnswers_sortedByDisplayOrderSnapshot() {
        LeadFormQuestion q1 = new LeadFormQuestion();
        q1.setId(UUID.randomUUID());
        LeadAnswer a1 = new LeadAnswer();
        a1.setQuestion(q1);
        a1.setQuestionLabelSnapshot("First");
        a1.setQuestionTypeSnapshot("short_text");
        a1.setAnswerValue(new ObjectMapper().getNodeFactory().textNode("A"));
        a1.setDisplayOrderSnapshot(1);
        a1.setCreatedAt(Instant.now());

        LeadFormQuestion q2 = new LeadFormQuestion();
        q2.setId(UUID.randomUUID());
        LeadAnswer a2 = new LeadAnswer();
        a2.setQuestion(q2);
        a2.setQuestionLabelSnapshot("Second");
        a2.setQuestionTypeSnapshot("short_text");
        a2.setAnswerValue(new ObjectMapper().getNodeFactory().textNode("B"));
        a2.setDisplayOrderSnapshot(2);
        a2.setCreatedAt(Instant.now());

        when(leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId))
                .thenReturn(List.of(a1, a2));

        var result = leadDetailsService.getAnswers(leadId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).questionLabel()).isEqualTo("First");
        assertThat(result.get(1).questionLabel()).isEqualTo("Second");
    }

    @Test
    void getLeadForm_returnsLeadSpecificQuestions() {
        LeadForm form = new LeadForm();
        form.setId(UUID.randomUUID());
        form.setTitle("Discovery Form");
        form.setPublicSlug("discovery");
        form.setIsActive(true);
        lead.setLeadForm(form);

        LeadFormQuestion question = new LeadFormQuestion();
        question.setId(UUID.randomUUID());
        question.setLeadForm(form);
        question.setLabel("Budget");
        question.setQuestionType("short_text");
        question.setRequired(true);
        question.setDisplayOrder(1);
        question.setIsActive(true);
        when(leadFormQuestionRepository.findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(form.getId()))
                .thenReturn(List.of(question));

        var response = leadDetailsService.getLeadForm(leadId);

        assertThat(response.id()).isEqualTo(form.getId());
        assertThat(response.questions()).hasSize(1);
        assertThat(response.questions().get(0).label()).isEqualTo("Budget");
    }

    @Test
    void updateAnswers_allowsSubsetAndPreservesHistoricalOrphans() throws Exception {
        LeadForm form = new LeadForm();
        form.setId(UUID.randomUUID());
        lead.setLeadForm(form);

        LeadFormQuestion requiredQuestion = new LeadFormQuestion();
        requiredQuestion.setId(UUID.randomUUID());
        requiredQuestion.setLeadForm(form);
        requiredQuestion.setLabel("Companie");
        requiredQuestion.setQuestionType("short_text");
        requiredQuestion.setRequired(true);
        requiredQuestion.setDisplayOrder(1);
        requiredQuestion.setIsActive(true);

        LeadFormQuestion editableQuestion = new LeadFormQuestion();
        editableQuestion.setId(UUID.randomUUID());
        editableQuestion.setLeadForm(form);
        editableQuestion.setLabel("Buget");
        editableQuestion.setQuestionType("short_text");
        editableQuestion.setRequired(false);
        editableQuestion.setDisplayOrder(2);
        editableQuestion.setIsActive(true);

        when(leadFormQuestionRepository.findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(form.getId()))
                .thenReturn(List.of(requiredQuestion, editableQuestion));

        LeadAnswer existingRequired = new LeadAnswer();
        existingRequired.setLead(lead);
        existingRequired.setQuestion(requiredQuestion);
        existingRequired.setQuestionLabelSnapshot("Companie");
        existingRequired.setQuestionTypeSnapshot("short_text");
        existingRequired.setAnswerValue(new ObjectMapper().readTree("\"SalesWay\""));
        existingRequired.setDisplayOrderSnapshot(1);
        existingRequired.setCreatedAt(Instant.now());

        LeadFormQuestion inactiveQuestion = new LeadFormQuestion();
        inactiveQuestion.setId(UUID.randomUUID());
        LeadAnswer orphan = new LeadAnswer();
        orphan.setLead(lead);
        orphan.setQuestion(inactiveQuestion);
        orphan.setQuestionLabelSnapshot("Istoric");
        orphan.setQuestionTypeSnapshot("short_text");
        orphan.setAnswerValue(new ObjectMapper().readTree("\"vechi\""));
        orphan.setDisplayOrderSnapshot(99);
        orphan.setCreatedAt(Instant.now());

        when(leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId))
                .thenReturn(List.of(existingRequired, orphan))
                .thenReturn(List.of(existingRequired, orphan));

        LeadAnswersUpdateRequest request = new LeadAnswersUpdateRequest();
        LeadAnswersUpdateRequest.Answer answer = new LeadAnswersUpdateRequest.Answer();
        answer.setQuestionId(editableQuestion.getId());
        answer.setValue(new ObjectMapper().readTree("\"5000 EUR\""));
        request.setAnswers(List.of(answer));

        var response = leadDetailsService.updateAnswers(leadId, request);

        assertThat(response).hasSize(2);
        verify(leadAnswerRepository).saveAll(any());
        org.mockito.Mockito.verify(leadAnswerRepository, org.mockito.Mockito.never()).deleteAll(any());
        verify(leadRepository).save(lead);
    }

    @Test
    void updateAnswers_validatesNumberBooleanAndMultiSelect() throws Exception {
        LeadForm form = new LeadForm();
        form.setId(UUID.randomUUID());
        lead.setLeadForm(form);

        LeadFormQuestion numberQuestion = new LeadFormQuestion();
        numberQuestion.setId(UUID.randomUUID());
        numberQuestion.setLeadForm(form);
        numberQuestion.setLabel("Seats");
        numberQuestion.setQuestionType("number");
        numberQuestion.setRequired(false);
        numberQuestion.setDisplayOrder(1);
        numberQuestion.setIsActive(true);

        LeadFormQuestion booleanQuestion = new LeadFormQuestion();
        booleanQuestion.setId(UUID.randomUUID());
        booleanQuestion.setLeadForm(form);
        booleanQuestion.setLabel("Approved");
        booleanQuestion.setQuestionType("boolean");
        booleanQuestion.setRequired(false);
        booleanQuestion.setDisplayOrder(2);
        booleanQuestion.setIsActive(true);

        LeadFormQuestion multiSelectQuestion = new LeadFormQuestion();
        multiSelectQuestion.setId(UUID.randomUUID());
        multiSelectQuestion.setLeadForm(form);
        multiSelectQuestion.setLabel("Channels");
        multiSelectQuestion.setQuestionType("multi_select");
        multiSelectQuestion.setRequired(false);
        multiSelectQuestion.setDisplayOrder(3);
        multiSelectQuestion.setIsActive(true);
        multiSelectQuestion.setOptionsJson(new ObjectMapper().readTree("[\"Email\",\"Phone\"]"));

        when(leadFormQuestionRepository.findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(form.getId()))
                .thenReturn(List.of(numberQuestion, booleanQuestion, multiSelectQuestion));
        when(leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId))
                .thenReturn(List.of())
                .thenReturn(List.of());

        LeadAnswersUpdateRequest request = new LeadAnswersUpdateRequest();
        LeadAnswersUpdateRequest.Answer numberAnswer = new LeadAnswersUpdateRequest.Answer();
        numberAnswer.setQuestionId(numberQuestion.getId());
        numberAnswer.setValue(new ObjectMapper().readTree("\"12\""));
        LeadAnswersUpdateRequest.Answer booleanAnswer = new LeadAnswersUpdateRequest.Answer();
        booleanAnswer.setQuestionId(booleanQuestion.getId());
        booleanAnswer.setValue(new ObjectMapper().readTree("\"true\""));
        LeadAnswersUpdateRequest.Answer multiSelectAnswer = new LeadAnswersUpdateRequest.Answer();
        multiSelectAnswer.setQuestionId(multiSelectQuestion.getId());
        multiSelectAnswer.setValue(new ObjectMapper().readTree("[\"Email\"]"));
        request.setAnswers(List.of(numberAnswer, booleanAnswer, multiSelectAnswer));

        leadDetailsService.updateAnswers(leadId, request);

        verify(leadAnswerRepository).saveAll(any());
    }

    @Test
    void updateAnswers_thenRegenerateAiInsights_usesPersistedAnswers() throws Exception {
        LeadForm form = new LeadForm();
        form.setId(UUID.randomUUID());
        lead.setLeadForm(form);

        LeadFormQuestion question = new LeadFormQuestion();
        question.setId(UUID.randomUUID());
        question.setLeadForm(form);
        question.setLabel("Buget");
        question.setQuestionType("short_text");
        question.setRequired(false);
        question.setDisplayOrder(1);
        question.setIsActive(true);
        when(leadFormQuestionRepository.findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(form.getId()))
                .thenReturn(List.of(question));

        LeadAnswer persistedAnswer = new LeadAnswer();
        persistedAnswer.setLead(lead);
        persistedAnswer.setQuestion(question);
        persistedAnswer.setQuestionLabelSnapshot("Buget");
        persistedAnswer.setQuestionTypeSnapshot("short_text");
        persistedAnswer.setAnswerValue(new ObjectMapper().readTree("\"7000 EUR\""));
        persistedAnswer.setDisplayOrderSnapshot(1);
        persistedAnswer.setCreatedAt(Instant.parse("2026-03-12T12:00:00Z"));
        when(leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId))
                .thenReturn(List.of())
                .thenReturn(List.of(persistedAnswer));
        when(leadAnswerRepository.findLatestCreatedAtByLeadId(leadId))
                .thenReturn(Instant.parse("2026-03-12T12:00:00Z"));

        LeadAnswersUpdateRequest request = new LeadAnswersUpdateRequest();
        LeadAnswersUpdateRequest.Answer answer = new LeadAnswersUpdateRequest.Answer();
        answer.setQuestionId(question.getId());
        answer.setValue(new ObjectMapper().readTree("\"7000 EUR\""));
        request.setAnswers(List.of(answer));
        leadDetailsService.updateAnswers(leadId, request);

        KbDocument document = new KbDocument();
        document.setId(UUID.randomUUID());
        document.setIsActive(true);
        when(kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId))
                .thenReturn(Optional.of(document));
        KbChunk chunk = new KbChunk();
        chunk.setContent("If budget is confirmed, move discussion toward next decision step.");
        chunk.setEmbeddingText("[0.4,0.6]");
        when(kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId()))
                .thenReturn(List.of(chunk));
        when(openAiClient.embed(any())).thenReturn(List.of(0.4, 0.6));
        when(openAiClient.chat(any(), eq(0.05))).thenReturn("""
                {"overall_sentiment":"neutral","risk_level":"low","key_blocker":"","trend":"stable"}
                """);
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {
                  "next_best_action":{"type":"clarify_next_step","priority":"high","timing":"today","channel":"call"},
                  "reason":"Bugetul este deja cunoscut.",
                  "psychological_insight":{"dominant_motivation":"claritate","primary_blocker":"","decision_readiness":"bună","confidence_state":"stabilă","risk_of_stalling":"mediu"},
                  "recommended_conversation_direction":{"primary_angle":"următorul pas","positioning":"direct","tone":"calm","focus_points":["pasul de decizie"]},
                  "key_questions_to_ask":["Ce urmează după buget?"],
                  "objection_strategy":{"main_objection_to_address":"","reframe":"","supporting_points":[]},
                  "what_to_avoid":["reluarea bugetului"],
                  "missing_information":["decident final"],
                  "scores":{"lead_readiness_score":7,"buying_intent_score":7,"psychological_resistance_score":3}
                }
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {"knownAlready":["Buget 7000 EUR"],"doNotAskAgain":["Buget"],"insistOn":["Pasul de decizie"],"missingInformation":["Decidentul final"]}
                """);

        leadDetailsService.regenerateAiInsights(leadId);

        ArgumentCaptor<List> messagesCaptor = ArgumentCaptor.forClass(List.class);
        verify(openAiClient, atLeastOnce()).chat(messagesCaptor.capture(), eq(0.1));
        String prompt = messagesCaptor.getAllValues().stream()
                .map(messages -> (List<java.util.Map<String, String>>) messages)
                .map(messages -> messages.get(1).get("content"))
                .filter(content -> content.contains("\"form_answers\""))
                .findFirst()
                .orElse("");
        assertThat(prompt).contains("Buget: 7000 EUR");
    }

    @Test
    void getActivities_leadNotFound_returns404() {
        UUID missingLeadId = UUID.randomUUID();
        when(leadRepository.findByIdAndCompanyId(missingLeadId, companyId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leadDetailsService.getActivities(missingLeadId, 0, 20))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void addCall_createsCallLogAndTimelineEvent() {
        LeadCallCreateRequest request = new LeadCallCreateRequest();
        request.setTitle("Qualification call");
        request.setDescription("Discussed budget and timeline.");
        request.setDurationSeconds(600);

        when(leadCallLogRepository.save(any())).thenAnswer(invocation -> {
            var callLog = invocation.getArgument(0, com.salesway.leads.entity.LeadCallLog.class);
            callLog.setId(UUID.randomUUID());
            callLog.setCreatedAt(Instant.now());
            return callLog;
        });

        var response = leadDetailsService.addCall(leadId, request);

        assertThat(response.type()).isEqualTo("call");
        verify(leadEventService).appendEvent(any(), eq(LeadEventType.CALL_LOGGED), eq("Lead call logged"), any());
    }

    @Test
    void addTask_assigneeOutsideCompany_rejected() {
        LeadTaskCreateRequest request = new LeadTaskCreateRequest();
        request.setTitle("Follow-up");
        request.setAssigneeUserId(UUID.randomUUID());
        when(companyMembershipRepository.findByCompanyIdAndUserId(companyId, request.getAssigneeUserId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> leadDetailsService.addTask(leadId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("current company");
    }

    @Test
    void aiInsights_scoreBoundedAndStablePayload() {
        LeadStandardFields sf = new LeadStandardFields();
        sf.setEmail("test@example.com");
        sf.setPhone("+40740111222");
        when(leadStandardFieldsRepository.findByLeadId(leadId)).thenReturn(Optional.of(sf));
        when(leadRepository.findRecentLeadIdsForAssignee(any(), any(), any())).thenReturn(List.of());

        LeadEvent noteEvent = new LeadEvent();
        noteEvent.setActorUserId(userId);
        noteEvent.setType(LeadEventType.NOTE_ADDED);
        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of(noteEvent)));

        var response = leadDetailsService.getAiInsights(leadId);

        assertThat(response.score()).isBetween(0, 100);
        assertThat(response.insightId()).isNotNull();
        assertThat(response.relationshipSentiment()).isNotBlank();
        assertThat(response.relationshipRiskLevel()).isNotBlank();
        assertThat(response.relationshipTrend()).isNotBlank();
        assertThat(response.confidenceScore()).isBetween(0.0, 1.0);
        assertThat(response.confidenceLevel()).isNotBlank();
        assertThat(response.guidanceSource()).isNotBlank();
        assertThat(response.nextBestAction()).isNotNull();
        assertThat(response.nextBestAction().actionType()).isNotBlank();
        assertThat(response.nextBestAction().priority()).isNotBlank();
        assertThat(response.nextBestAction().channel()).isNotBlank();
        assertThat(response.whatChanged()).isNotNull();
        assertThat(response.explainability()).isNotNull();
        assertThat(response.explainability().whyThisInsight()).isNotBlank();
        assertThat(response.recommendedAction()).isNotBlank();
        assertThat(response.suggestedApproach()).isNotBlank();
        assertThat(response.scoreFactors()).isNotEmpty();
        assertThat(response.scoreFactors())
                .allSatisfy(factor -> assertThat(factor.value()).isBetween(0, 10));
        assertThat(response.generatedAt()).isNotNull();
    }

    @Test
    void aiInsights_usesVectorMatchWhenNotesAreAbbreviated() throws Exception {
        LeadEvent noteEvent = new LeadEvent();
        noteEvent.setActorUserId(userId);
        noteEvent.setType(LeadEventType.NOTE_ADDED);
        noteEvent.setPayload(new ObjectMapper().readTree("""
                {"text":"client vrea impl rapida, buget ok, dec final in call urm."}
                """));
        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of(noteEvent)));

        KbDocument document = new KbDocument();
        document.setId(UUID.randomUUID());
        document.setIsActive(true);
        when(kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId))
                .thenReturn(Optional.of(document));

        KbChunk semanticMatch = new KbChunk();
        semanticMatch.setContent("For fast implementation buyers, lead with deployment speed and a low-risk rollout plan.");
        semanticMatch.setEmbeddingText("[1.0,0.0]");
        KbChunk lexicalOnlyMiss = new KbChunk();
        lexicalOnlyMiss.setContent("Discuss procurement paperwork and legal review sequence.");
        lexicalOnlyMiss.setEmbeddingText("[0.0,1.0]");
        when(kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId()))
                .thenReturn(List.of(semanticMatch, lexicalOnlyMiss));

        when(openAiClient.embed(any())).thenReturn(List.of(1.0, 0.0));
        when(openAiClient.chat(any(), eq(0.05))).thenReturn("""
                {
                  "overall_sentiment":"positive",
                  "risk_level":"low",
                  "key_blocker":"",
                  "trend":"improving"
                }
                """);
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {
                  "confirmedFacts":["Bugetul este validat."],
                  "currentObjection":"Clientul vrea implementare rapidă, cu risc scăzut.",
                  "conversationStage":"După calificare, înainte de confirmarea planului de rollout.",
                  "nextExpectedStep":"Confirmă planul de implementare și pașii imediat următori.",
                  "openQuestions":["Ce viteză de rollout acceptă clientul?"],
                  "confidence":0.84,
                  "next_best_action":{"type":"schedule_call","priority":"high","timing":"within_24h","channel":"phone"},
                  "reason":"Lead-ul reacționează bine la un plan clar și rapid de implementare.",
                  "psychological_insight":{"dominant_motivation":"viteză și control","primary_blocker":"teama de implementare cu risc","decision_readiness":"ridicată","confidence_state":"prudentă","risk_of_stalling":"mediu"},
                  "recommended_conversation_direction":{"primary_angle":"rapiditatea implementării","positioning":"consultativ","tone":"clar și sigur","focus_points":["reducerea riscului","rapiditatea implementării"]},
                  "key_questions_to_ask":["Ce blocaj vreți să eliminați primul?"],
                  "objection_strategy":{"main_objection_to_address":"riscul perceput","reframe":"Leagă viteza de un plan controlabil, nu de promisiuni vagi.","supporting_points":["Propune un rollout etapizat."]},
                  "what_to_avoid":["promisiuni vagi"],
                  "missing_information":["Pașii concreți de implementare"],
                  "scores":{"client_score":72,"next_call_close_probability":58,"lead_readiness_score":7,"buying_intent_score":7,"psychological_resistance_score":4}
                }
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {
                  "knownAlready":["Bugetul este validat."],
                  "doNotAskAgain":["Buget"],
                  "insistOn":["Planul de rollout și reducerea riscului"],
                  "missingInformation":["Pașii concreți de implementare"]
                }
                """);
        var response = leadDetailsService.getAiInsights(leadId);

        assertThat(response.recommendedAction()).contains("rapiditatea implementării");
        assertThat(response.suggestedApproach()).contains("rollout etapizat");
        assertThat(response.suggestedApproach()).contains("Script tactic recomandat");
        assertThat(response.clientScore()).isGreaterThanOrEqualTo(20);
        assertThat(response.nextCallCloseProbability()).isGreaterThanOrEqualTo(20);
        assertThat(response.relationshipSentiment()).isEqualTo("positive");
        assertThat(response.confidenceLevel()).isIn("medium", "high");
        assertThat(response.guidanceSource()).isEqualTo("ai");
        assertThat(response.nextBestAction().actionType()).isIn("schedule_call", "prepare_demo", "clarify_next_step", "prepare_materials");
        assertThat(response.explainability().kbEvidence()).isNotEmpty();
        verify(openAiClient).embed(any());
        verify(openAiClient).chat(any(), eq(0.05));
        verify(openAiClient, times(2)).chat(any(), eq(0.1));
        verify(openAiClient).chat(any(), eq(0.15));
    }

    @Test
    void aiInsights_usesExtractedConversationStateToAvoidGenericSuggestions() throws Exception {
        LeadEvent budgetNote = new LeadEvent();
        budgetNote.setActorUserId(userId);
        budgetNote.setType(LeadEventType.NOTE_ADDED);
        budgetNote.setCreatedAt(Instant.parse("2026-03-10T10:15:30Z"));
        budgetNote.setPayload(new ObjectMapper().readTree("""
                {"text":"Buget confirmat 5000 EUR. Demo stabilit pe 15 martie.","category":"TYPE_CONFIRMATION"}
                """));
        LeadEvent objectionNote = new LeadEvent();
        objectionNote.setActorUserId(userId);
        objectionNote.setType(LeadEventType.NOTE_ADDED);
        objectionNote.setCreatedAt(Instant.parse("2026-03-10T10:30:00Z"));
        objectionNote.setPayload(new ObjectMapper().readTree("""
                {"text":"Clientul vrea să minimizeze riscul de implementare.","category":"TYPE_OBJECTION"}
                """));

        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of(objectionNote, budgetNote)));

        KbDocument document = new KbDocument();
        document.setId(UUID.randomUUID());
        document.setIsActive(true);
        when(kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId))
                .thenReturn(Optional.of(document));

        KbChunk chunk = new KbChunk();
        chunk.setContent("Before a scheduled demo, confirm who attends, the evaluation criteria, and the next decision checkpoint.");
        chunk.setEmbeddingText("[0.8,0.2]");
        when(kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId()))
                .thenReturn(List.of(chunk));

        when(openAiClient.embed(any())).thenReturn(List.of(0.8, 0.2));
        when(openAiClient.chat(any(), eq(0.05))).thenReturn("""
                {
                  "overall_sentiment":"at_risk",
                  "risk_level":"high",
                  "key_blocker":"pricing concerns",
                  "trend":"decreasing"
                }
                """);
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {
                  "confirmedFacts":["Buget confirmat la 5000 EUR","Demo stabilit pe 15 martie"],
                  "currentObjection":"",
                  "conversationStage":"După confirmarea bugetului, înainte de demo.",
                  "nextExpectedStep":"Confirmă agenda demo-ului și participanții la decizie.",
                  "openQuestions":["Cine participă la demo din partea clientului?"],
                  "confidence":0.92,
                  "next_best_action":{"type":"recover_relationship","priority":"high","timing":"today","channel":"phone"},
                  "reason":"Nu relua discuția despre buget; lead-ul trebuie dus spre criteriile de decizie validate.",
                  "psychological_insight":{"dominant_motivation":"claritate","primary_blocker":"pricing concerns","decision_readiness":"moderată","confidence_state":"fragilă","risk_of_stalling":"ridicat"},
                  "recommended_conversation_direction":{"primary_angle":"Nu relua discuția despre buget","positioning":"ferm dar consultativ","tone":"calm","focus_points":["stakeholder","agenda demo-ului"]},
                  "key_questions_to_ask":["Cine trebuie să fie prezent la demo pentru a putea decide mai departe?"],
                  "objection_strategy":{"main_objection_to_address":"pricing concerns","reframe":"Leagă răspunsul de obiectivele și bugetul deja confirmate.","supporting_points":["Dacă lipsește un stakeholder, reprogramează demo-ul doar după ce îl includeți."]},
                  "what_to_avoid":["reluarea bugetului"],
                  "missing_information":["Cine decide după demo","Criteriile finale de evaluare"],
                  "scores":{"client_score":63,"next_call_close_probability":39,"lead_readiness_score":6,"buying_intent_score":6,"psychological_resistance_score":6}
                }
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {
                  "knownAlready":["Buget confirmat la 5000 EUR","Demo stabilit pe 15 martie"],
                  "doNotAskAgain":["Bugetul clientului","Data demo-ului"],
                  "insistOn":["Participanții la decizie","Agenda demo-ului"],
                  "missingInformation":["Cine decide după demo","Criteriile finale de evaluare"]
                }
                """);
        var response = leadDetailsService.getAiInsights(leadId);

        assertThat(response.recommendedAction()).contains("Nu relua discuția despre buget");
        assertThat(response.suggestedApproach()).contains("stakeholder");
        assertThat(response.suggestedApproach()).contains("pricing concerns");
        assertThat(response.suggestedApproach()).contains("Script tactic recomandat");
        assertThat(response.relationshipSentiment()).isEqualTo("at_risk");
        assertThat(response.relationshipRiskLevel()).isEqualTo("high");
        assertThat(response.relationshipKeyBlocker()).isEqualTo("pricing concerns");
        assertThat(response.scoreFactors().stream().anyMatch(factor -> factor.label().equals("Relationship Risk"))).isTrue();
        assertThat(response.confidenceLevel()).isIn("medium", "high");
        assertThat(response.nextBestAction().actionType()).isEqualTo("recover_relationship");
        assertThat(response.nextBestAction().priority()).isIn("high", "urgent");
        assertThat(response.nextBestAction().channel()).isIn("phone", "phone_and_personal_message");
        assertThat(response.whatChanged()).isNotNull();
        assertThat(response.whatChanged().changes()).isNotEmpty();
        ArgumentCaptor<List> messagesCaptor = ArgumentCaptor.forClass(List.class);
        verify(openAiClient, atLeastOnce()).chat(messagesCaptor.capture(), eq(0.1));
        @SuppressWarnings("unchecked")
        String prompt = messagesCaptor.getAllValues().stream()
                .map(messages -> (List<java.util.Map<String, String>>) messages)
                .map(messages -> messages.get(1).get("content"))
                .filter(content -> content.contains("relationship_sentiment"))
                .findFirst()
                .orElse("");
        assertThat(prompt).contains("\"relationship_sentiment\": \"at_risk\"");
        assertThat(prompt).contains("\"relationship_risk\": \"high\"");
        assertThat(prompt).contains("\"do_not_ask_again\": [\"Bugetul clientului\", \"Data demo-ului\"]");
        verify(openAiClient).chat(any(), eq(0.05));
        verify(openAiClient, times(2)).chat(any(), eq(0.1));
        verify(openAiClient).chat(any(), eq(0.15));
        verify(openAiClient, atLeastOnce()).embed(any());
    }

    @Test
    void aiInsights_includesRecentInsightMemoryInPrompt() throws Exception {
        LeadAiInsightMemory previousInsight = new LeadAiInsightMemory();
        previousInsight.setId(UUID.randomUUID());
        previousInsight.setScore(79);
        previousInsight.setRecommendedAction("Confirmă ora meetingului.");
        previousInsight.setSuggestedApproach("Ține discuția scurtă și orientată pe calendar.");
        previousInsight.setFeedbackStatus(LeadInsightFeedbackStatus.COMPLETED);
        previousInsight.setFeedbackNote("Meetingul a fost confirmat ieri.");
        when(leadAiInsightMemoryRepository.findTop3ByLeadIdAndCompanyIdOrderByCreatedAtDesc(leadId, companyId))
                .thenReturn(List.of(previousInsight));

        KbDocument document = new KbDocument();
        document.setId(UUID.randomUUID());
        document.setIsActive(true);
        when(kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId))
                .thenReturn(Optional.of(document));

        KbChunk chunk = new KbChunk();
        chunk.setContent("After confirming the meeting time, move to technical preparation and stakeholder alignment.");
        chunk.setEmbeddingText("[0.5,0.5]");
        when(kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId()))
                .thenReturn(List.of(chunk));
        when(openAiClient.embed(any())).thenReturn(List.of(0.5, 0.5));
        when(openAiClient.chat(any(), eq(0.05))).thenReturn("""
                {"overall_sentiment":"stalled","risk_level":"medium","key_blocker":"meeting logistics","trend":"stable"}
                """);
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {"confirmedFacts":["Meetingul este confirmat"],"currentObjection":"","conversationStage":"După confirmarea meetingului, înainte de pregătirea demo-ului.","nextExpectedStep":"Pregătește prezentarea tehnică.","openQuestions":["Ce trebuie demonstrat tehnic?"],"confidence":0.7}
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {"knownAlready":["Meetingul este confirmat"],"doNotAskAgain":["Ora meetingului"],"insistOn":["Pregătirea tehnică"],"missingInformation":["Cazurile de utilizare tehnice"]}
                """);
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {"confirmedFacts":["Meetingul este confirmat"],"currentObjection":"","conversationStage":"După confirmarea meetingului, înainte de pregătirea demo-ului.","nextExpectedStep":"Pregătește prezentarea tehnică.","openQuestions":["Ce trebuie demonstrat tehnic?"],"confidence":0.7,
                "next_best_action":{"type":"prepare_materials","priority":"high","timing":"today","channel":"call"},
                "reason":"Treci de la logistică la pregătirea demonstrației tehnice.",
                "psychological_insight":{"dominant_motivation":"claritate","primary_blocker":"meeting logistics","decision_readiness":"bună","confidence_state":"stabilă","risk_of_stalling":"mediu"},
                "recommended_conversation_direction":{"primary_angle":"pregătirea demonstrației tehnice","positioning":"consultativ","tone":"calm","focus_points":["criterii tehnice"]},
                "key_questions_to_ask":["Ce scenarii tehnice trebuie acoperite?"],
                "objection_strategy":{"main_objection_to_address":"logistică","reframe":"Leagă demonstrația de criteriile tehnice de evaluare.","supporting_points":["Confirmă cine validează partea tehnică."]},
                "what_to_avoid":["reluarea logisticii"],
                "missing_information":["Cazurile de utilizare tehnice"],
                "scores":{"client_score":64,"next_call_close_probability":42,"lead_readiness_score":6,"buying_intent_score":6,"psychological_resistance_score":4}}
                """);

        leadDetailsService.getAiInsights(leadId);

        ArgumentCaptor<List> messagesCaptor = ArgumentCaptor.forClass(List.class);
        verify(openAiClient, atLeastOnce()).chat(messagesCaptor.capture(), eq(0.1));
        @SuppressWarnings("unchecked")
        String prompt = messagesCaptor.getAllValues().stream()
                .map(messages -> (List<java.util.Map<String, String>>) messages)
                .map(messages -> messages.get(1).get("content"))
                .filter(content -> content.contains("recent_insight_memory"))
                .findFirst()
                .orElse("");
        assertThat(prompt).contains("\"recent_insight_memory\": \"score=79 | action=Confirmă ora meetingului. | feedback=COMPLETED | feedbackNote=Meetingul a fost confirmat ieri.\"");
    }

    @Test
    void aiInsights_includesFormAnswersInAiPrompt() throws Exception {
        LeadAnswer answer = new LeadAnswer();
        answer.setQuestionLabelSnapshot("Buget estimat");
        answer.setQuestionTypeSnapshot("short_text");
        answer.setAnswerValue(new ObjectMapper().readTree("\"5000 EUR\""));
        answer.setDisplayOrderSnapshot(1);
        answer.setCreatedAt(Instant.parse("2026-03-12T09:00:00Z"));
        when(leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId))
                .thenReturn(List.of(answer));
        when(leadAnswerRepository.findLatestCreatedAtByLeadId(leadId))
                .thenReturn(answer.getCreatedAt());

        KbDocument document = new KbDocument();
        document.setId(UUID.randomUUID());
        document.setIsActive(true);
        when(kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId))
                .thenReturn(Optional.of(document));

        KbChunk chunk = new KbChunk();
        chunk.setContent("If budget is already confirmed, avoid reopening pricing and move toward decision criteria.");
        chunk.setEmbeddingText("[0.3,0.7]");
        when(kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId()))
                .thenReturn(List.of(chunk));
        when(openAiClient.embed(any())).thenReturn(List.of(0.3, 0.7));
        when(openAiClient.chat(any(), eq(0.05))).thenReturn("""
                {"overall_sentiment":"neutral","risk_level":"low","key_blocker":"","trend":"stable"}
                """);
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {
                  "next_best_action":{"type":"clarify_next_step","priority":"high","timing":"today","channel":"call"},
                  "reason":"Bugetul este deja clarificat și trebuie avansat pasul de decizie.",
                  "psychological_insight":{"dominant_motivation":"claritate","primary_blocker":"niciunul","decision_readiness":"bună","confidence_state":"stabilă","risk_of_stalling":"mediu"},
                  "recommended_conversation_direction":{"primary_angle":"următorul pas","positioning":"direct","tone":"calm","focus_points":["criterii de decizie"]},
                  "key_questions_to_ask":["Ce lipsește pentru decizie?"],
                  "objection_strategy":{"main_objection_to_address":"","reframe":"","supporting_points":[]},
                  "what_to_avoid":["reluarea bugetului"],
                  "missing_information":["criteriile finale"],
                  "scores":{"lead_readiness_score":7,"buying_intent_score":7,"psychological_resistance_score":3}
                }
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {"knownAlready":["Bugetul este 5000 EUR"],"doNotAskAgain":["Bugetul"],"insistOn":["Criteriile de decizie"],"missingInformation":["Cine aprobă final"]}
                """);

        leadDetailsService.getAiInsights(leadId);

        ArgumentCaptor<List> messagesCaptor = ArgumentCaptor.forClass(List.class);
        verify(openAiClient, atLeastOnce()).chat(messagesCaptor.capture(), eq(0.1));
        String prompt = messagesCaptor.getAllValues().stream()
                .map(messages -> (List<java.util.Map<String, String>>) messages)
                .map(messages -> messages.get(1).get("content"))
                .filter(content -> content.contains("\"form_answers\""))
                .findFirst()
                .orElse("");
        assertThat(prompt).contains("Buget estimat: 5000 EUR");
        assertThat(prompt).contains("\"form_answers\": [");
    }

    @Test
    void aiInsights_lowConfidenceUsesFallbackGuidance() throws Exception {
        LeadEvent noteEvent = new LeadEvent();
        noteEvent.setActorUserId(userId);
        noteEvent.setType(LeadEventType.NOTE_ADDED);
        noteEvent.setPayload(new ObjectMapper().readTree("""
                {"text":"Clientul nu este convins și nu e clar ce urmează."}
                """));
        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of(noteEvent)));
        when(openAiClient.chat(any(), eq(0.05))).thenThrow(new IllegalStateException("sentiment unavailable"));
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {"confirmedFacts":[],"currentObjection":"","conversationStage":"","nextExpectedStep":"","openQuestions":[],"confidence":0.1}
                """);

        var response = leadDetailsService.getAiInsights(leadId);

        assertThat(response.confidenceLevel()).isEqualTo("low");
        assertThat(response.guidanceSource()).isEqualTo("fallback");
        assertThat(response.nextBestAction()).isNotNull();
        assertThat(response.nextBestAction().deadlineHint()).isNotBlank();
        assertThat(response.explainability()).isNotNull();
        assertThat(response.scoreFactors().stream().anyMatch(factor -> factor.label().equals("Confidence Guardrail"))).isTrue();
    }

    @Test
    void updateInsightFeedback_persistsManagerFeedback() {
        UUID insightId = UUID.randomUUID();
        LeadAiInsightMemory memory = new LeadAiInsightMemory();
        memory.setId(insightId);
        when(leadAiInsightMemoryRepository.findByIdAndLeadIdAndCompanyId(insightId, leadId, companyId))
                .thenReturn(Optional.of(memory));

        LeadAiInsightFeedbackRequest request = new LeadAiInsightFeedbackRequest();
        request.setStatus(LeadInsightFeedbackStatus.COMPLETED);
        request.setNote("S-a confirmat meetingul.");

        leadDetailsService.updateInsightFeedback(leadId, insightId, request);

        assertThat(memory.getFeedbackStatus()).isEqualTo(LeadInsightFeedbackStatus.COMPLETED);
        assertThat(memory.getFeedbackNote()).isEqualTo("S-a confirmat meetingul.");
        verify(leadAiInsightMemoryRepository).save(memory);
    }

    @Test
    void aiInsights_cacheHitSkipsRegeneration() throws Exception {
        Lead lead = new Lead();
        lead.setId(leadId);
        lead.setCompany(new Company());
        lead.setSubmittedAt(Instant.parse("2026-03-12T10:00:00Z"));
        lead.setLastActivityAt(Instant.parse("2026-03-12T11:00:00Z"));
        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));

        KbDocument document = new KbDocument();
        document.setId(UUID.randomUUID());
        document.setUpdatedAt(Instant.parse("2026-03-12T09:00:00Z"));
        when(kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId))
                .thenReturn(Optional.of(document));
        KbChunk chunk = new KbChunk();
        chunk.setContent("Clarify the next step and assign an owner.");
        chunk.setEmbeddingText("[0.6,0.4]");
        when(kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId()))
                .thenReturn(List.of(chunk));

        LeadEvent noteEvent = new LeadEvent();
        noteEvent.setActorUserId(userId);
        noteEvent.setType(LeadEventType.NOTE_ADDED);
        noteEvent.setPayload(new ObjectMapper().readTree("""
                {"text":"Clientul cere claritate pe următorii pași."}
                """));
        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of(noteEvent)));
        when(openAiClient.embed(any())).thenReturn(List.of(0.6, 0.4));
        when(openAiClient.chat(any(), eq(0.05))).thenReturn("""
                {"overall_sentiment":"neutral","risk_level":"low","key_blocker":"","trend":"stable"}
                """);
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {"confirmedFacts":[],"currentObjection":"","conversationStage":"În clarificare","nextExpectedStep":"Confirmă pasul următor","openQuestions":["Ce urmează concret?"],"confidence":0.8,
                "next_best_action":{"type":"clarify_next_step","priority":"high","timing":"within_24h","channel":"phone"},
                "reason":"Clarifică pasul următor.",
                "psychological_insight":{"dominant_motivation":"claritate","primary_blocker":"","decision_readiness":"medie","confidence_state":"stabilă","risk_of_stalling":"mediu"},
                "recommended_conversation_direction":{"primary_angle":"clarificarea următorului pas","positioning":"direct","tone":"clar","focus_points":["următorul pas concret"]},
                "key_questions_to_ask":["Cine face următoarea acțiune?"],
                "objection_strategy":{"main_objection_to_address":"","reframe":"Elimină ambiguitatea și confirmă termenul.","supporting_points":["Fixează un responsabil."]},
                "what_to_avoid":["ambiguitatea"],
                "missing_information":["Deadline-ul următorului pas"],
                "scores":{"client_score":58,"next_call_close_probability":37,"lead_readiness_score":6,"buying_intent_score":5,"psychological_resistance_score":4}}
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {"knownAlready":[],"doNotAskAgain":[],"insistOn":["Pasul următor concret"],"missingInformation":["Deadline-ul următorului pas"]}
                """);
        when(openAiClient.chat(any(), eq(0.2))).thenReturn("""
                {"callDirection":"Clarifică pasul următor.","openingLine":"Hai să stabilim concret care e următorul pas.","discoveryQuestions":["Cine face următoarea acțiune?"],"decisionTree":["Dacă nu e clar owner-ul -> fixează un responsabil."],"objectionHandling":"Elimină ambiguitatea și confirmă termenul."}
                """);

        final LeadAiInsightSnapshot[] storedSnapshot = new LeadAiInsightSnapshot[1];
        when(leadAiInsightSnapshotRepository.findByLeadIdAndCompanyId(leadId, companyId))
                .thenAnswer(invocation -> storedSnapshot[0] == null ? Optional.empty() : Optional.of(storedSnapshot[0]));
        when(leadAiInsightSnapshotRepository.save(any())).thenAnswer(invocation -> {
            storedSnapshot[0] = invocation.getArgument(0);
            return storedSnapshot[0];
        });

        LeadAiInsightsResponse first = leadDetailsService.getAiInsights(leadId);
        LeadAiInsightsResponse second = leadDetailsService.getAiInsights(leadId);

        assertThat(second.insightId()).isEqualTo(first.insightId());
        verify(leadAiInsightMemoryRepository).save(any());
        verify(openAiClient).chat(any(), eq(0.05));
        verify(openAiClient, times(2)).chat(any(), eq(0.1));
        verify(openAiClient).chat(any(), eq(0.15));
    }

    @Test
    void regenerateAiInsights_createsNewInsightWhenAnswersChanged() {
        LeadAiInsightSnapshot snapshot = new LeadAiInsightSnapshot();
        snapshot.setId(UUID.randomUUID());
        snapshot.setLatestInsightMemoryId(UUID.randomUUID());
        snapshot.setScore(61);
        snapshot.setClientScore(55);
        snapshot.setNextCallCloseProbability(35);
        snapshot.setRelationshipSentiment("neutral");
        snapshot.setRelationshipRiskLevel("low");
        snapshot.setRelationshipTrend("stable");
        snapshot.setRelationshipKeyBlocker("");
        snapshot.setConfidenceScore(0.81);
        snapshot.setConfidenceLevel("high");
        snapshot.setGuidanceSource("ai");
        snapshot.setRecommendedAction("Vechiul pas următor.");
        snapshot.setSuggestedApproach("Vechiul approach.");
        snapshot.setGeneratedAt(Instant.parse("2026-03-12T10:00:00Z"));
        snapshot.setLastRegeneratedAt(Instant.parse("2026-03-12T10:00:00Z"));
        when(leadAiInsightSnapshotRepository.findByLeadIdAndCompanyId(leadId, companyId))
                .thenReturn(Optional.of(snapshot));
        when(leadAnswerRepository.findLatestCreatedAtByLeadId(leadId))
                .thenReturn(Instant.parse("2026-03-12T12:00:00Z"));

        LeadEvent noteEvent = new LeadEvent();
        noteEvent.setActorUserId(userId);
        noteEvent.setType(LeadEventType.NOTE_ADDED);
        noteEvent.setPayload(new ObjectMapper().getNodeFactory().objectNode().put("text", "Clientul cere pașii următori."));
        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of(noteEvent)));

        LeadAiInsightsResponse response = leadDetailsService.regenerateAiInsights(leadId);

        assertThat(response.insightId()).isNotNull();
        verify(leadAiInsightMemoryRepository).save(any());
    }

    @Test
    void aiInsights_doesNotRepeatCompletedRecommendation() throws Exception {
        LeadAiInsightMemory completedInsight = new LeadAiInsightMemory();
        completedInsight.setId(UUID.randomUUID());
        completedInsight.setRecommendedAction("Confirmă ora meetingului.");
        completedInsight.setFeedbackStatus(LeadInsightFeedbackStatus.COMPLETED);
        when(leadAiInsightMemoryRepository.findTop3ByLeadIdAndCompanyIdOrderByCreatedAtDesc(leadId, companyId))
                .thenReturn(List.of(completedInsight));

        KbDocument document = new KbDocument();
        document.setId(UUID.randomUUID());
        when(kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId))
                .thenReturn(Optional.of(document));
        KbChunk chunk = new KbChunk();
        chunk.setContent("Once the meeting is confirmed, move to agenda and technical preparation.");
        chunk.setEmbeddingText("[0.7,0.3]");
        when(kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId()))
                .thenReturn(List.of(chunk));

        LeadEvent noteEvent = new LeadEvent();
        noteEvent.setActorUserId(userId);
        noteEvent.setType(LeadEventType.NOTE_ADDED);
        noteEvent.setPayload(new ObjectMapper().readTree("""
                {"text":"Meetingul este deja confirmat, trebuie pregătită agenda tehnică.","category":"TYPE_CONFIRMATION"}
                """));
        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of(noteEvent)));
        when(openAiClient.embed(any())).thenReturn(List.of(0.7, 0.3));
        when(openAiClient.chat(any(), eq(0.05))).thenReturn("""
                {"overall_sentiment":"neutral","risk_level":"low","key_blocker":"","trend":"stable"}
                """);
        when(openAiClient.chat(any(), eq(0.1))).thenReturn("""
                {"confirmedFacts":["Meetingul este confirmat"],"currentObjection":"","conversationStage":"După confirmarea meetingului.","nextExpectedStep":"Pregătește agenda tehnică.","openQuestions":["Ce trebuie inclus în prezentare?"],"confidence":0.82,
                "next_best_action":{"type":"schedule_call","priority":"high","timing":"today","channel":"phone"},
                "reason":"Confirmă ora meetingului.",
                "psychological_insight":{"dominant_motivation":"claritate","primary_blocker":"","decision_readiness":"bună","confidence_state":"stabilă","risk_of_stalling":"mediu"},
                "recommended_conversation_direction":{"primary_angle":"Confirmă ora meetingului.","positioning":"direct","tone":"calm","focus_points":["agenda tehnică"]},
                "key_questions_to_ask":["La ce oră rămâne?"],
                "objection_strategy":{"main_objection_to_address":"","reframe":"Elimină orice neclaritate logistică.","supporting_points":["Confirmă calendarul."]},
                "what_to_avoid":["ambiguitatea"],
                "missing_information":["Scenariile tehnice de demo"],
                "scores":{"client_score":57,"next_call_close_probability":33,"lead_readiness_score":6,"buying_intent_score":5,"psychological_resistance_score":5}}
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {"knownAlready":["Meetingul este confirmat"],"doNotAskAgain":["Ora meetingului"],"insistOn":["Agenda tehnică"],"missingInformation":["Scenariile tehnice de demo"]}
                """);
        LeadAiInsightsResponse response = leadDetailsService.getAiInsights(leadId);

        assertThat(response.guidanceSource()).isIn("guardrailed", "ai");
        assertThat(response.recommendedAction()).contains("Agenda tehnică");
        assertThat(response.nextBestAction().actionType()).isIn("prepare_materials", "clarify_next_step", "prepare_demo", "schedule_call");
        assertThat(response.whatChanged().changes().stream().anyMatch(item -> item.contains("Previous recommendation"))).isTrue();
        if ("guardrailed".equals(response.guidanceSource())) {
            assertThat(response.recommendedAction()).doesNotContain("Confirmă ora meetingului");
            assertThat(response.scoreFactors().stream().anyMatch(factor -> factor.label().equals("Anti-Repetition Guardrail"))).isTrue();
        }
    }
}
