package com.salesway.leads.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.chatbot.client.OpenAiClient;
import com.salesway.chatbot.entity.KbChunk;
import com.salesway.chatbot.entity.KbDocument;
import com.salesway.chatbot.repository.KbChunkRepository;
import com.salesway.chatbot.repository.KbDocumentRepository;
import com.salesway.companies.entity.Company;
import com.salesway.leads.dto.LeadCallCreateRequest;
import com.salesway.leads.dto.LeadAiInsightFeedbackRequest;
import com.salesway.leads.dto.LeadAiInsightsResponse;
import com.salesway.leads.dto.LeadTaskCreateRequest;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAnswer;
import com.salesway.leads.entity.LeadAiInsightMemory;
import com.salesway.leads.entity.LeadEvent;
import com.salesway.leads.entity.LeadFormQuestion;
import com.salesway.leads.entity.LeadStandardFields;
import com.salesway.leads.enums.LeadEventType;
import com.salesway.leads.enums.LeadInsightFeedbackStatus;
import com.salesway.leads.repository.LeadAnswerRepository;
import com.salesway.leads.repository.LeadAiInsightMemoryRepository;
import com.salesway.leads.repository.LeadCallLogRepository;
import com.salesway.leads.repository.LeadEventRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.repository.LeadStandardFieldsRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LeadDetailsServiceTest {

    private LeadRepository leadRepository;
    private LeadAnswerRepository leadAnswerRepository;
    private LeadAiInsightMemoryRepository leadAiInsightMemoryRepository;
    private LeadEventRepository leadEventRepository;
    private LeadCallLogRepository leadCallLogRepository;
    private LeadStandardFieldsRepository leadStandardFieldsRepository;
    private TaskBoardItemRepository taskBoardItemRepository;
    private CompanyMembershipRepository companyMembershipRepository;
    private LeadEventService leadEventService;
    private UserRepository userRepository;
    private KbDocumentRepository kbDocumentRepository;
    private KbChunkRepository kbChunkRepository;
    private OpenAiClient openAiClient;
    private LeadDetailsService leadDetailsService;

    private UUID companyId;
    private UUID leadId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        leadRepository = mock(LeadRepository.class);
        leadAnswerRepository = mock(LeadAnswerRepository.class);
        leadAiInsightMemoryRepository = mock(LeadAiInsightMemoryRepository.class);
        leadEventRepository = mock(LeadEventRepository.class);
        leadCallLogRepository = mock(LeadCallLogRepository.class);
        leadStandardFieldsRepository = mock(LeadStandardFieldsRepository.class);
        taskBoardItemRepository = mock(TaskBoardItemRepository.class);
        companyMembershipRepository = mock(CompanyMembershipRepository.class);
        leadEventService = mock(LeadEventService.class);
        userRepository = mock(UserRepository.class);
        kbDocumentRepository = mock(KbDocumentRepository.class);
        kbChunkRepository = mock(KbChunkRepository.class);
        openAiClient = mock(OpenAiClient.class);
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
        when(managerAccessService.getManagerMembership()).thenReturn(membership);

        Lead lead = new Lead();
        lead.setId(leadId);
        lead.setCompany(company);
        lead.setStatus("new");
        lead.setSubmittedAt(Instant.now());
        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));
        when(leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(eq(companyId), eq(leadId), any()))
                .thenReturn(new PageImpl<>(List.of()));
        when(leadAiInsightMemoryRepository.findTop3ByLeadIdAndCompanyIdOrderByCreatedAtDesc(leadId, companyId))
                .thenReturn(List.of());
        when(leadAiInsightMemoryRepository.findLatestUpdatedAtByLeadIdAndCompanyId(leadId, companyId))
                .thenReturn(null);
        when(leadAiInsightMemoryRepository.save(any())).thenAnswer(invocation -> {
            LeadAiInsightMemory memory = invocation.getArgument(0);
            memory.setId(UUID.randomUUID());
            return memory;
        });

        leadDetailsService = new LeadDetailsService(
                leadRepository,
                leadAnswerRepository,
                leadAiInsightMemoryRepository,
                leadEventRepository,
                leadCallLogRepository,
                leadStandardFieldsRepository,
                taskBoardItemRepository,
                companyMembershipRepository,
                leadEventService,
                managerAccessService,
                userRepository,
                kbDocumentRepository,
                kbChunkRepository,
                openAiClient,
                new ObjectMapper()
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
        assertThat(response.whatChanged()).isNotNull();
        assertThat(response.explainability()).isNotNull();
        assertThat(response.explainability().whyThisInsight()).isNotBlank();
        assertThat(response.recommendedAction()).isNotBlank();
        assertThat(response.suggestedApproach()).isNotBlank();
        assertThat(response.scoreFactors()).isNotEmpty();
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
                  "confidence":0.84
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
        when(openAiClient.chat(any(), eq(0.2))).thenReturn("""
                {
                  "callDirection":"Condu conversația spre rapiditatea implementării și reducerea riscului.",
                  "openingLine":"Vreau să înțeleg cât de repede trebuie să vedeți primele rezultate.",
                  "discoveryQuestions":["Ce blocaj vreți să eliminați primul?"],
                  "decisionTree":["Dacă clientul spune că se grăbește -> propune un rollout etapizat."],
                  "objectionHandling":"Leagă viteza de un plan controlabil, nu de promisiuni vagi."
                }
                """);

        var response = leadDetailsService.getAiInsights(leadId);

        assertThat(response.recommendedAction()).contains("rapiditatea implementării");
        assertThat(response.suggestedApproach()).contains("rollout etapizat");
        assertThat(response.suggestedApproach()).contains("Nu întreba din nou:");
        assertThat(response.relationshipSentiment()).isEqualTo("positive");
        assertThat(response.confidenceLevel()).isIn("medium", "high");
        assertThat(response.guidanceSource()).isEqualTo("ai");
        assertThat(response.nextBestAction().actionType()).isIn("schedule_call", "prepare_demo", "clarify_next_step", "prepare_materials");
        assertThat(response.explainability().kbEvidence()).isNotEmpty();
        verify(openAiClient).embed(any());
        verify(openAiClient).chat(any(), eq(0.05));
        verify(openAiClient).chat(any(), eq(0.1));
        verify(openAiClient).chat(any(), eq(0.15));
        verify(openAiClient).chat(any(), eq(0.2));
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
                  "confidence":0.92
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
        when(openAiClient.chat(any(), eq(0.2))).thenReturn("""
                {
                  "callDirection":"Nu relua discuția despre buget; pregătește demo-ul în jurul criteriilor de decizie deja validate.",
                  "openingLine":"Aș vrea să aliniez agenda demo-ului la ce ați confirmat deja ca prioritate.",
                  "discoveryQuestions":["Cine trebuie să fie prezent la demo pentru a putea decide mai departe?"],
                  "decisionTree":["Dacă spune că mai lipsește un stakeholder -> reprogramează demo-ul doar după ce îl includeți."],
                  "objectionHandling":"Dacă apar dubii noi, leagă răspunsul de obiectivele și bugetul deja confirmate."
                }
                """);

        var response = leadDetailsService.getAiInsights(leadId);

        assertThat(response.recommendedAction()).contains("Nu relua discuția despre buget");
        assertThat(response.suggestedApproach()).contains("stakeholder");
        assertThat(response.suggestedApproach()).contains("Nu întreba din nou:");
        assertThat(response.suggestedApproach()).contains("Insistă pe:");
        assertThat(response.relationshipSentiment()).isEqualTo("at_risk");
        assertThat(response.relationshipRiskLevel()).isEqualTo("high");
        assertThat(response.relationshipKeyBlocker()).isEqualTo("pricing concerns");
        assertThat(response.scoreFactors().stream().anyMatch(factor -> factor.label().equals("Relationship Risk"))).isTrue();
        assertThat(response.confidenceLevel()).isIn("medium", "high");
        assertThat(response.nextBestAction().actionType()).isEqualTo("recover_relationship");
        assertThat(response.nextBestAction().priority()).isEqualTo("urgent");
        assertThat(response.whatChanged()).isNotNull();
        assertThat(response.whatChanged().changes()).isNotEmpty();
        ArgumentCaptor<List> messagesCaptor = ArgumentCaptor.forClass(List.class);
        verify(openAiClient).chat(messagesCaptor.capture(), eq(0.2));
        @SuppressWarnings("unchecked")
        List<java.util.Map<String, String>> messages = messagesCaptor.getValue();
        String prompt = messages.get(1).get("content");
        assertThat(prompt).contains("confirmationNotes: Buget confirmat 5000 EUR. Demo stabilit pe 15 martie.");
        assertThat(prompt).contains("objectionNotes: Clientul vrea să minimizeze riscul de implementare.");
        assertThat(prompt).contains("relationshipSentiment: at_risk");
        assertThat(prompt).contains("relationshipRisk: high");
        assertThat(prompt).contains("doNotAskAgain: Bugetul clientului | Data demo-ului");
        assertThat(prompt).contains("insistOn: Participanții la decizie | Agenda demo-ului");
        verify(openAiClient).chat(any(), eq(0.05));
        verify(openAiClient).chat(any(), eq(0.1));
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
        when(openAiClient.chat(any(), eq(0.2))).thenReturn("""
                {"callDirection":"Treci de la logistică la pregătirea demonstrației tehnice.","openingLine":"Având meetingul confirmat, aș vrea să calibrez demo-ul pe partea tehnică.","discoveryQuestions":["Ce scenarii tehnice trebuie acoperite?"],"decisionTree":["Dacă lipsesc stakeholderi tehnici -> confirmă cine validează partea tehnică."],"objectionHandling":"Leagă demonstrația de criteriile tehnice de evaluare."}
                """);

        leadDetailsService.getAiInsights(leadId);

        ArgumentCaptor<List> messagesCaptor = ArgumentCaptor.forClass(List.class);
        verify(openAiClient).chat(messagesCaptor.capture(), eq(0.2));
        @SuppressWarnings("unchecked")
        List<java.util.Map<String, String>> messages = messagesCaptor.getValue();
        String prompt = messages.get(1).get("content");
        assertThat(prompt).contains("recentInsightMemory: score=79 | action=Confirmă ora meetingului. | feedback=COMPLETED | feedbackNote=Meetingul a fost confirmat ieri.");
        assertThat(prompt).contains("relationshipSentiment: neutral");
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
                {"confirmedFacts":[],"currentObjection":"","conversationStage":"În clarificare","nextExpectedStep":"Confirmă pasul următor","openQuestions":["Ce urmează concret?"],"confidence":0.8}
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {"knownAlready":[],"doNotAskAgain":[],"insistOn":["Pasul următor concret"],"missingInformation":["Deadline-ul următorului pas"]}
                """);
        when(openAiClient.chat(any(), eq(0.2))).thenReturn("""
                {"callDirection":"Clarifică pasul următor.","openingLine":"Hai să stabilim concret care e următorul pas.","discoveryQuestions":["Cine face următoarea acțiune?"],"decisionTree":["Dacă nu e clar owner-ul -> fixează un responsabil."],"objectionHandling":"Elimină ambiguitatea și confirmă termenul."}
                """);

        LeadAiInsightsResponse first = leadDetailsService.getAiInsights(leadId);
        LeadAiInsightsResponse second = leadDetailsService.getAiInsights(leadId);

        assertThat(second.insightId()).isEqualTo(first.insightId());
        verify(leadAiInsightMemoryRepository).save(any());
        verify(openAiClient).chat(any(), eq(0.05));
        verify(openAiClient).chat(any(), eq(0.1));
        verify(openAiClient).chat(any(), eq(0.15));
        verify(openAiClient).chat(any(), eq(0.2));
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
                {"confirmedFacts":["Meetingul este confirmat"],"currentObjection":"","conversationStage":"După confirmarea meetingului.","nextExpectedStep":"Pregătește agenda tehnică.","openQuestions":["Ce trebuie inclus în prezentare?"],"confidence":0.82}
                """);
        when(openAiClient.chat(any(), eq(0.15))).thenReturn("""
                {"knownAlready":["Meetingul este confirmat"],"doNotAskAgain":["Ora meetingului"],"insistOn":["Agenda tehnică"],"missingInformation":["Scenariile tehnice de demo"]}
                """);
        when(openAiClient.chat(any(), eq(0.2))).thenReturn("""
                {"callDirection":"Confirmă ora meetingului.","openingLine":"Hai să reconfirmăm ora meetingului.","discoveryQuestions":["La ce oră rămâne?"],"decisionTree":["Dacă nu este sigur -> reconfirmă calendarul."],"objectionHandling":"Elimină orice neclaritate logistică."}
                """);

        LeadAiInsightsResponse response = leadDetailsService.getAiInsights(leadId);

        assertThat(response.guidanceSource()).isEqualTo("guardrailed");
        assertThat(response.recommendedAction()).contains("Agenda tehnică");
        assertThat(response.recommendedAction()).doesNotContain("Confirmă ora meetingului");
        assertThat(response.nextBestAction().actionType()).isIn("prepare_materials", "clarify_next_step", "prepare_demo");
        assertThat(response.whatChanged().changes().stream().anyMatch(item -> item.contains("Previous recommendation"))).isTrue();
        assertThat(response.scoreFactors().stream().anyMatch(factor -> factor.label().equals("Anti-Repetition Guardrail"))).isTrue();
    }
}
