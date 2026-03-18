package com.salesway.leads.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.BooleanNode;
import com.fasterxml.jackson.databind.node.DecimalNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.chatbot.client.OpenAiClient;
import com.salesway.chatbot.entity.KbChunk;
import com.salesway.chatbot.entity.KbDocument;
import com.salesway.chatbot.repository.KbChunkRepository;
import com.salesway.chatbot.repository.KbDocumentRepository;
import com.salesway.leads.dto.LeadActivityResponse;
import com.salesway.leads.dto.LeadAiInsightFactorResponse;
import com.salesway.leads.dto.LeadAiInsightFeedbackRequest;
import com.salesway.leads.dto.LeadAiExplainabilityResponse;
import com.salesway.leads.dto.LeadAiInsightsResponse;
import com.salesway.leads.dto.LeadAiNextBestActionResponse;
import com.salesway.leads.dto.LeadAiWhatChangedResponse;
import com.salesway.leads.dto.LeadAnswersUpdateRequest;
import com.salesway.leads.dto.LeadCallCreateRequest;
import com.salesway.leads.dto.LeadDetailAnswerItemResponse;
import com.salesway.leads.dto.LeadFormResponse;
import com.salesway.leads.dto.LeadQuestionResponse;
import com.salesway.leads.dto.LeadTaskCreateRequest;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAnswer;
import com.salesway.leads.entity.LeadAiInsightMemory;
import com.salesway.leads.entity.LeadAiInsightSnapshot;
import com.salesway.leads.entity.LeadCallLog;
import com.salesway.leads.entity.LeadEvent;
import com.salesway.leads.entity.LeadFormQuestion;
import com.salesway.leads.entity.LeadStandardFields;
import com.salesway.leads.enums.LeadNoteCategory;
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
import com.salesway.tasks.entity.TaskBoardItem;
import com.salesway.tasks.enums.TaskBoardStatus;
import com.salesway.tasks.repository.TaskBoardItemRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class LeadDetailsService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final double HYBRID_VECTOR_WEIGHT = 0.65;
    private static final double HYBRID_LEXICAL_WEIGHT = 0.35;
    private static final double MIN_VECTOR_SIMILARITY = 0.20;
    private static final double MIN_AI_GUIDANCE_CONFIDENCE = 0.55;
    private static final Set<String> TEXT_TYPES = Set.of("short_text", "long_text");
    private static final Logger LOG = LoggerFactory.getLogger(LeadDetailsService.class);
    private final LeadRepository leadRepository;
    private final LeadAnswerRepository leadAnswerRepository;
    private final LeadAiInsightMemoryRepository leadAiInsightMemoryRepository;
    private final LeadAiInsightSnapshotRepository leadAiInsightSnapshotRepository;
    private final LeadEventRepository leadEventRepository;
    private final LeadCallLogRepository leadCallLogRepository;
    private final LeadStandardFieldsRepository leadStandardFieldsRepository;
    private final LeadFormQuestionRepository leadFormQuestionRepository;
    private final TaskBoardItemRepository taskBoardItemRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final CompanyAccessService companyAccessService;
    private final LeadEventService leadEventService;
    private final ManagerAccessService managerAccessService;
    private final UserRepository userRepository;
    private final KbDocumentRepository kbDocumentRepository;
    private final KbChunkRepository kbChunkRepository;
    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public LeadDetailsService(
            LeadRepository leadRepository,
            LeadAnswerRepository leadAnswerRepository,
            LeadAiInsightMemoryRepository leadAiInsightMemoryRepository,
            LeadAiInsightSnapshotRepository leadAiInsightSnapshotRepository,
            LeadEventRepository leadEventRepository,
            LeadCallLogRepository leadCallLogRepository,
            LeadStandardFieldsRepository leadStandardFieldsRepository,
            LeadFormQuestionRepository leadFormQuestionRepository,
            TaskBoardItemRepository taskBoardItemRepository,
            CompanyMembershipRepository companyMembershipRepository,
            CompanyAccessService companyAccessService,
            LeadEventService leadEventService,
            ManagerAccessService managerAccessService,
            UserRepository userRepository,
            KbDocumentRepository kbDocumentRepository,
            KbChunkRepository kbChunkRepository,
            OpenAiClient openAiClient,
            ObjectMapper objectMapper
    ) {
        this.leadRepository = leadRepository;
        this.leadAnswerRepository = leadAnswerRepository;
        this.leadAiInsightMemoryRepository = leadAiInsightMemoryRepository;
        this.leadAiInsightSnapshotRepository = leadAiInsightSnapshotRepository;
        this.leadEventRepository = leadEventRepository;
        this.leadCallLogRepository = leadCallLogRepository;
        this.leadStandardFieldsRepository = leadStandardFieldsRepository;
        this.leadFormQuestionRepository = leadFormQuestionRepository;
        this.taskBoardItemRepository = taskBoardItemRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.companyAccessService = companyAccessService;
        this.leadEventService = leadEventService;
        this.managerAccessService = managerAccessService;
        this.userRepository = userRepository;
        this.kbDocumentRepository = kbDocumentRepository;
        this.kbChunkRepository = kbChunkRepository;
        this.openAiClient = openAiClient;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<LeadDetailAnswerItemResponse> getAnswers(UUID leadId) {
        CompanyMembership membership = companyAccessService.getActiveMembership();
        Lead lead = getLeadOrThrow(leadId, membership);
        return leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(lead.getId())
                .stream()
                .map(this::toAnswerResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public LeadFormResponse getLeadForm(UUID leadId) {
        CompanyMembership membership = companyAccessService.getActiveMembership();
        Lead lead = getLeadOrThrow(leadId, membership);
        if (lead.getLeadForm() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead form not found");
        }
        List<LeadQuestionResponse> questions = leadFormQuestionRepository
                .findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(lead.getLeadForm().getId())
                .stream()
                .map(this::toQuestionResponse)
                .toList();
        return new LeadFormResponse(
                lead.getLeadForm().getId(),
                lead.getLeadForm().getTitle(),
                lead.getLeadForm().getPublicSlug(),
                lead.getLeadForm().getIsActive(),
                questions
        );
    }

    @Transactional
    public List<LeadDetailAnswerItemResponse> updateAnswers(UUID leadId, LeadAnswersUpdateRequest request) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        Lead lead = getLeadOrThrow(leadId, membership.getCompany().getId());
        if (lead.getLeadForm() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lead form is missing for this lead");
        }

        List<LeadFormQuestion> activeQuestions = leadFormQuestionRepository
                .findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(lead.getLeadForm().getId());
        Map<UUID, LeadFormQuestion> questionsById = new LinkedHashMap<>();
        for (LeadFormQuestion question : activeQuestions) {
            questionsById.put(question.getId(), question);
        }

        Map<UUID, JsonNode> incomingAnswersByQuestionId = new LinkedHashMap<>();
        for (LeadAnswersUpdateRequest.Answer answer : request.getAnswers()) {
            LeadFormQuestion question = questionsById.get(answer.getQuestionId());
            if (question == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "questionId invalid or inactive for this form: " + answer.getQuestionId());
            }
            JsonNode normalizedValue = normalizeAnswerValue(question, answer.getValue());
            if (incomingAnswersByQuestionId.put(answer.getQuestionId(), normalizedValue) != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "answers questionId duplicated: " + answer.getQuestionId());
            }
        }

        for (Map.Entry<UUID, JsonNode> entry : incomingAnswersByQuestionId.entrySet()) {
            if (entry.getValue() == null) {
                continue;
            }
            LeadFormQuestion question = questionsById.get(entry.getKey());
            validateAnswerValue(question, entry.getValue());
        }

        List<LeadAnswer> existingAnswers = leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId);
        Map<UUID, LeadAnswer> existingByQuestionId = existingAnswers.stream()
                .filter(answer -> answer.getQuestion() != null && answer.getQuestion().getId() != null)
                .collect(Collectors.toMap(
                        answer -> answer.getQuestion().getId(),
                        answer -> answer,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));

        List<UUID> missingRequired = activeQuestions.stream()
                .filter(question -> Boolean.TRUE.equals(question.getRequired()))
                .map(LeadFormQuestion::getId)
                .filter(questionId -> {
                    if (incomingAnswersByQuestionId.containsKey(questionId)) {
                        return incomingAnswersByQuestionId.get(questionId) == null;
                    }
                    LeadAnswer existingAnswer = existingByQuestionId.get(questionId);
                    return existingAnswer == null || existingAnswer.getAnswerValue() == null || existingAnswer.getAnswerValue().isNull();
                })
                .toList();
        if (!missingRequired.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing required questionIds: " + missingRequired);
        }

        List<LeadAnswer> answersToDelete = incomingAnswersByQuestionId.entrySet().stream()
                .filter(entry -> entry.getValue() == null)
                .map(entry -> existingByQuestionId.get(entry.getKey()))
                .filter(answer -> answer != null)
                .toList();
        if (!answersToDelete.isEmpty()) {
            leadAnswerRepository.deleteAll(answersToDelete);
        }

        List<LeadAnswer> answersToSave = new ArrayList<>();
        for (Map.Entry<UUID, JsonNode> entry : incomingAnswersByQuestionId.entrySet()) {
            if (entry.getValue() == null) {
                continue;
            }
            LeadFormQuestion question = questionsById.get(entry.getKey());
            LeadAnswer answer = existingByQuestionId.get(entry.getKey());
            if (answer == null) {
                answer = new LeadAnswer();
                answer.setLead(lead);
                answer.setQuestion(question);
            }
            answer.setAnswerValue(entry.getValue());
            answer.setQuestionLabelSnapshot(question.getLabel());
            answer.setQuestionTypeSnapshot(question.getQuestionType());
            answer.setRequiredSnapshot(question.getRequired());
            answer.setOptionsSnapshot(question.getOptionsJson());
            answer.setDisplayOrderSnapshot(question.getDisplayOrder());
            answersToSave.add(answer);
        }
        if (!answersToSave.isEmpty()) {
            leadAnswerRepository.saveAll(answersToSave);
        }

        lead.setLastActivityAt(Instant.now());
        leadRepository.save(lead);

        return leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId)
                .stream()
                .map(this::toAnswerResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<LeadActivityResponse> getActivities(UUID leadId, int page, int size) {
        validatePaging(page, size);
        CompanyMembership membership = companyAccessService.getActiveMembership();
        Lead lead = getLeadOrThrow(leadId, membership);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Collection<LeadEventType> types = EnumSet.of(
                LeadEventType.NOTE_ADDED,
                LeadEventType.CALL_LOGGED,
                LeadEventType.TASK_CREATED,
                LeadEventType.TASK_COMPLETED,
                LeadEventType.STATUS_CHANGED,
                LeadEventType.EMAIL_SENT
        );
        Page<LeadEvent> events = leadEventRepository.findByCompanyIdAndLeadIdAndTypeInOrderByCreatedAtDesc(
                membership.getCompany().getId(),
                lead.getId(),
                types,
                pageable
        );
        Map<UUID, String> actorNames = resolveActorNames(events.getContent());
        return events.map(event -> toActivityResponse(event, actorNames.get(event.getActorUserId())));
    }

    @Transactional
    public LeadActivityResponse addCall(UUID leadId, LeadCallCreateRequest request) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        Lead lead = getLeadOrThrow(leadId, membership.getCompany().getId());
        UUID actorUserId = membership.getUser().getId();
        String title = normalizeRequired(request.getTitle(), "title");

        LeadCallLog callLog = new LeadCallLog();
        callLog.setLead(lead);
        callLog.setCompany(lead.getCompany());
        callLog.setActorUserId(actorUserId);
        callLog.setTitle(title);
        callLog.setDescription(normalizeOptional(request.getDescription()));
        callLog.setOutcome(normalizeOptional(request.getOutcome()));
        callLog.setDurationSeconds(request.getDurationSeconds());
        callLog.setCallTime(request.getCallTime());
        LeadCallLog savedLog = leadCallLogRepository.save(callLog);

        Map<String, Object> payload = new HashMap<>();
        payload.put("callLogId", savedLog.getId());
        payload.put("title", savedLog.getTitle());
        payload.put("description", savedLog.getDescription());
        payload.put("outcome", savedLog.getOutcome());
        payload.put("durationSeconds", savedLog.getDurationSeconds());
        payload.put("callTime", savedLog.getCallTime());
        leadEventService.appendEvent(lead, LeadEventType.CALL_LOGGED, "Lead call logged", payload);
        leadRepository.save(lead);

        return new LeadActivityResponse(
                savedLog.getId(),
                "call",
                "Apel înregistrat",
                savedLog.getDescription() != null ? savedLog.getDescription() : savedLog.getTitle(),
                buildActorName(membership.getUser()),
                savedLog.getCreatedAt()
        );
    }

    @Transactional
    public LeadActivityResponse addTask(UUID leadId, LeadTaskCreateRequest request) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        UUID companyId = membership.getCompany().getId();
        Lead lead = getLeadOrThrow(leadId, companyId);
        String title = normalizeRequired(request.getTitle(), "title");
        UUID assigneeUserId = validateAssignee(request.getAssigneeUserId(), companyId);

        TaskBoardItem task = new TaskBoardItem();
        task.setMembership(membership);
        task.setLeadId(lead.getId());
        task.setTitle(title);
        task.setGoal(normalizeOptional(request.getDescription()));
        task.setDeadline(request.getDueDate());
        task.setStatus(TaskBoardStatus.TODO);
        task.setAssigneeUserId(assigneeUserId);
        TaskBoardItem savedTask = taskBoardItemRepository.save(task);

        leadEventService.appendEvent(
                lead,
                LeadEventType.TASK_CREATED,
                "Task created for lead",
                Map.of(
                        "taskId", savedTask.getId(),
                        "title", savedTask.getTitle(),
                        "description", savedTask.getGoal(),
                        "status", savedTask.getStatus().name()
                )
        );
        leadRepository.save(lead);

        return new LeadActivityResponse(
                savedTask.getId(),
                "task",
                "Task creat",
                savedTask.getGoal() != null ? savedTask.getGoal() : savedTask.getTitle(),
                buildActorName(membership.getUser()),
                savedTask.getCreatedAt()
        );
    }

    @Transactional
    public LeadAiInsightsResponse getAiInsights(UUID leadId) {
        CompanyMembership membership = companyAccessService.getActiveMembership();
        UUID companyId = membership.getCompany().getId();
        Lead lead = getLeadOrThrow(leadId, membership);
        KbDocument activeKbDocument = kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId).orElse(null);
        Instant latestFeedbackAt = leadAiInsightMemoryRepository.findLatestUpdatedAtByLeadIdAndCompanyId(leadId, companyId);
        Instant latestAnswerAt = leadAnswerRepository.findLatestCreatedAtByLeadId(leadId);
        return leadAiInsightSnapshotRepository.findByLeadIdAndCompanyId(leadId, companyId)
                .filter(snapshot -> !isSnapshotStale(snapshot, lead, activeKbDocument, latestFeedbackAt, latestAnswerAt))
                .map(this::toResponse)
                .orElseGet(() -> regenerateAiInsights(leadId));
    }

    @Transactional
    public LeadAiInsightsResponse regenerateAiInsights(UUID leadId) {
        CompanyMembership membership = companyAccessService.getActiveMembership();
        UUID companyId = membership.getCompany().getId();
        UUID currentUserId = membership.getUser().getId();
        Lead lead = getLeadOrThrow(leadId, membership);
        KbDocument activeKbDocument = kbDocumentRepository.findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(companyId).orElse(null);
        Instant latestFeedbackAt = leadAiInsightMemoryRepository.findLatestUpdatedAtByLeadIdAndCompanyId(leadId, companyId);
        List<LeadAiInsightMemory> recentMemories = leadAiInsightMemoryRepository
                .findTop3ByLeadIdAndCompanyIdOrderByCreatedAtDesc(leadId, companyId);
        List<LeadAnswer> leadAnswers = leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId);
        List<String> formAnswerSummaries = summarizeLeadAnswers(leadAnswers);
        AnswerSignals answerSignals = extractAnswerSignals(leadAnswers);
        QualificationSignals qualificationSignals = extractQualificationSignals(noteTextsFromAnswersAndRecentMemory(formAnswerSummaries, recentMemories), formAnswerSummaries, answerSignals);

        int score = 0;
        List<LeadAiInsightFactorResponse> factors = new java.util.ArrayList<>();

        LeadStandardFields standardFields = leadStandardFieldsRepository.findByLeadId(leadId).orElse(null);
        boolean hasContactDetails = standardFields != null
                && standardFields.getEmail() != null
                && !standardFields.getEmail().isBlank()
                && standardFields.getPhone() != null
                && !standardFields.getPhone().isBlank();
        if (hasContactDetails) {
            score += 20;
            factors.add(impactFactor(
                    "Contactability",
                    20,
                    "Lead has both email and phone available."
            ));
        } else {
            factors.add(ratedFactor(
                    "Contactability",
                    2,
                    "Missing direct contact details lowers qualification confidence."
            ));
        }

        if (lead.getAssignedToUserId() != null) {
            score += 15;
            factors.add(impactFactor(
                    "Ownership",
                    15,
                    "Lead is already assigned for follow-up."
            ));
        }

        Page<LeadEvent> recentEvents = leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(
                companyId,
                leadId,
                PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<String> noteTexts = recentEvents.getContent().stream()
                .filter(event -> event.getType() == LeadEventType.NOTE_ADDED)
                .map(this::resolveDescription)
                .filter(text -> text != null && !text.isBlank())
                .limit(8)
                .toList();
        CategorizedNotes categorizedNotes = categorizeNotes(recentEvents.getContent());
        RelationshipSignal relationshipSignal = analyzeRelationshipSignal(recentEvents.getContent(), categorizedNotes, lead);
        ConversationState conversationState = extractConversationState(
                recentEvents.getContent(),
                noteTexts,
                categorizedNotes,
                formAnswerSummaries
        );
        long actorInteractions = recentEvents.getContent().stream()
                .filter(event -> currentUserId.equals(event.getActorUserId()))
                .count();
        int rawInteractionPoints = (int) Math.min(actorInteractions * 6L, 24L);
        int interactionPoints = (int) Math.round(rawInteractionPoints * relationshipSignal.engagementMultiplier());
        score += interactionPoints;
        factors.add(impactFactor(
                "Manager Engagement",
                interactionPoints,
                interactionPoints > 0
                        ? "Current manager already has timeline interactions on this lead."
                        : "No timeline interactions yet from current manager."
        ));
        if (interactionPoints != rawInteractionPoints) {
            factors.add(impactFactor(
                    "Engagement Quality",
                    interactionPoints - rawInteractionPoints,
                    interactionPoints >= rawInteractionPoints
                            ? "Positive relationship momentum amplified the value of recent interactions."
                            : "Tension in the relationship reduced the value of recent interactions."
            ));
        }
        if (relationshipSignal.scoreAdjustment() != 0) {
            score += relationshipSignal.scoreAdjustment();
            factors.add(impactFactor(
                    "Relationship Risk",
                    relationshipSignal.scoreAdjustment(),
                    relationshipSignal.scoreImpactReason()
            ));
        }
        applyQualificationSignals(qualificationSignals, factors);
        score += qualificationSignals.scoreAdjustment();
        applyAnswerSignals(answerSignals, factors);
        score += answerSignals.scoreBoost();

        if ("qualified".equalsIgnoreCase(lead.getStatus())) {
            score += 18;
            factors.add(impactFactor(
                    "Pipeline Status",
                    18,
                    "Lead is already in qualified stage."
            ));
        } else if ("new".equalsIgnoreCase(lead.getStatus())) {
            score += 8;
            factors.add(impactFactor(
                    "Pipeline Status",
                    8,
                    "Lead is new and still needs qualification."
            ));
        } else {
            score += 4;
            factors.add(impactFactor(
                    "Pipeline Status",
                    4,
                    "Lead is active in pipeline."
            ));
        }

        if (lead.getDuplicateGroupId() != null) {
            score -= 12;
            factors.add(impactFactor(
                    "Duplicate Risk",
                    -12,
                    "Lead is part of a duplicate group."
            ));
        }

        List<String> kbSnippets = findRelevantBlackBookSnippets(
                companyId,
                lead,
                noteTexts,
                conversationState,
                categorizedNotes,
                formAnswerSummaries,
                activeKbDocument
        );
        if (!kbSnippets.isEmpty()) {
            score += 8;
            factors.add(impactFactor(
                    "Black Book Match",
                    8,
                    "Recommendations are grounded in company sales playbook sections."
            ));
        }

        int workloadPoints = 0;
        if (lead.getAssignedToUserId() != null) {
            int recentAssignedLeadCount = leadRepository.findRecentLeadIdsForAssignee(
                    companyId,
                    lead.getAssignedToUserId(),
                    Instant.now().minusSeconds(30L * 24L * 3600L)
            ).size();
            if (recentAssignedLeadCount <= 20) {
                workloadPoints = 10;
            } else if (recentAssignedLeadCount <= 40) {
                workloadPoints = 5;
            }
            score += workloadPoints;
            factors.add(impactFactor(
                    "Assignee Capacity",
                    workloadPoints,
                    workloadPoints > 0
                            ? "Assigned owner has manageable recent workload."
                            : "Assigned owner has high recent lead load."
            ));
        }

        score = Math.max(0, Math.min(100, score));

        String recommendedAction = score >= 75
                ? "Schedule a qualification call today."
                : score >= 50
                ? "Create a follow-up task and contact within 24 hours."
                : "Enrich lead data and add a note before outreach.";
        if (!conversationState.nextExpectedStep().isBlank()) {
            recommendedAction = "Următorul pas recomandat: " + conversationState.nextExpectedStep();
        }

        String suggestedApproach = score >= 75
                ? "Anchor discussion on ROI and implementation speed."
                : score >= 50
                ? "Start discovery with pain points and timeline urgency."
                : "Validate profile fit first, then personalize first touch.";
        if (!conversationState.conversationStage().isBlank()) {
            suggestedApproach = "Stadiu conversație: " + conversationState.conversationStage() + ". " + suggestedApproach;
        }

        GapAnalysis gapAnalysis = buildGapAnalysis(conversationState, categorizedNotes, kbSnippets);
        AntiRepetitionRules antiRepetitionRules = buildAntiRepetitionRules(recentMemories, conversationState, gapAnalysis);
        ConfidenceAssessment confidenceAssessment = assessConfidence(
                relationshipSignal,
                conversationState,
                gapAnalysis,
                kbSnippets
        );
        AiGuidance aiGuidance = generateBlackBookGuidance(
                lead,
                standardFields,
                noteTexts,
                conversationState,
                categorizedNotes,
                formAnswerSummaries,
                summarizeRecentInsights(recentMemories),
                gapAnalysis,
                antiRepetitionRules,
                relationshipSignal,
                kbSnippets,
                recommendedAction,
                suggestedApproach
        );
        String guidanceSource = "ai";
        Integer aiClientScore = null;
        Integer nextCallCloseProbability = null;
        if (confidenceAssessment.shouldUseFallback() || !aiGuidance.aiGenerated()) {
            AiGuidance safeGuidance = fallbackStructuredGuidance(
                    noteTexts,
                    conversationState,
                    categorizedNotes,
                    gapAnalysis,
                    recommendedAction,
                    suggestedApproach
            );
            recommendedAction = safeGuidance.recommendedAction();
            suggestedApproach = safeGuidance.suggestedApproach();
            guidanceSource = "fallback";
            factors.add(ratedFactor(
                    "Confidence Guardrail",
                    5,
                    confidenceAssessment.fallbackReason()
            ));
        } else {
            recommendedAction = aiGuidance.recommendedAction();
            suggestedApproach = aiGuidance.suggestedApproach();
            StrategyScores strategyScores = aiGuidance.strategy() == null ? null : aiGuidance.strategy().scores();
            if (strategyScores != null) {
                aiClientScore = strategyScores.clientScore();
                nextCallCloseProbability = strategyScores.nextCallCloseProbability();
                int strategyAdjustment = calculateStrategyScoreAdjustment(strategyScores);
                if (strategyAdjustment != 0) {
                    score += strategyAdjustment;
                    factors.add(impactFactor(
                            "Strategic Buying Signals",
                            strategyAdjustment,
                            buildStrategyScoreReason(strategyScores)
                    ));
                }
            }
        }
        int derivedClientScore = calculateDerivedClientScore(score, qualificationSignals, answerSignals);
        int finalClientScore = clampScore(aiClientScore != null
                ? (int) Math.round((derivedClientScore * 0.65) + (aiClientScore * 0.35))
                : derivedClientScore);
        int finalNextCallCloseProbability = clampScore(nextCallCloseProbability != null
                ? nextCallCloseProbability
                : calculateFallbackCloseProbability(finalClientScore, relationshipSignal, answerSignals));
        factors.add(ratedFactor(
                "Close Probability",
                Math.max(0, Math.min(10, Math.round(finalNextCallCloseProbability / 10.0f))),
                "Probabilitate estimată de închidere la următorul apel: " + finalNextCallCloseProbability + "%."
        ));
        score = clampScore(score);
        GuidanceAdjustment guidanceAdjustment = enforceAntiRepetition(
                recommendedAction,
                suggestedApproach,
                antiRepetitionRules,
                conversationState,
                gapAnalysis
        );
        if (guidanceAdjustment.adjusted()) {
            recommendedAction = guidanceAdjustment.recommendedAction();
            suggestedApproach = guidanceAdjustment.suggestedApproach();
            guidanceSource = "guardrailed";
            factors.add(ratedFactor(
                    "Anti-Repetition Guardrail",
                    5,
                    guidanceAdjustment.reason()
            ));
        }

        LeadAiInsightMemory savedInsight = saveInsightMemory(lead, score, recommendedAction, suggestedApproach);
        LeadAiNextBestActionResponse nextBestAction = mapNextBestAction(
                score,
                relationshipSignal,
                answerSignals,
                guidanceSource,
                aiGuidance,
                gapAnalysis,
                conversationState
        );
        LeadAiWhatChangedResponse whatChanged = buildWhatChanged(
                recentMemories,
                relationshipSignal,
                gapAnalysis,
                conversationState
        );
        LeadAiExplainabilityResponse explainability = buildExplainability(
                factors,
                kbSnippets,
                whatChanged
        );

        LeadAiInsightsResponse response = new LeadAiInsightsResponse(
                savedInsight.getId(),
                score,
                finalClientScore,
                finalNextCallCloseProbability,
                relationshipSignal.overallSentiment(),
                relationshipSignal.riskLevel(),
                relationshipSignal.trend(),
                relationshipSignal.keyBlocker(),
                confidenceAssessment.score(),
                confidenceAssessment.level(),
                guidanceSource,
                nextBestAction,
                whatChanged,
                explainability,
                recommendedAction,
                suggestedApproach,
                factors,
                Instant.now()
        );
        saveInsightSnapshot(lead, response);
        return response;
    }

    @Transactional
    public void updateInsightFeedback(UUID leadId, UUID insightId, LeadAiInsightFeedbackRequest request) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        UUID companyId = membership.getCompany().getId();
        getLeadOrThrow(leadId, companyId);
        LeadAiInsightMemory memory = leadAiInsightMemoryRepository.findByIdAndLeadIdAndCompanyId(insightId, leadId, companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "AI insight not found"));
        memory.setFeedbackStatus(request.getStatus() == null ? LeadInsightFeedbackStatus.NONE : request.getStatus());
        memory.setFeedbackNote(normalizeOptional(request.getNote()));
        leadAiInsightMemoryRepository.save(memory);
    }

    private LeadDetailAnswerItemResponse toAnswerResponse(LeadAnswer answer) {
        return new LeadDetailAnswerItemResponse(
                answer.getQuestion() != null ? answer.getQuestion().getId() : null,
                answer.getQuestionLabelSnapshot(),
                answer.getQuestionTypeSnapshot(),
                serializeAnswer(answer.getAnswerValue()),
                answer.getCreatedAt()
        );
    }

    private LeadQuestionResponse toQuestionResponse(LeadFormQuestion question) {
        return new LeadQuestionResponse(
                question.getId(),
                question.getQuestionType(),
                question.getLabel(),
                question.getPlaceholder(),
                question.getHelpText(),
                question.getRequired(),
                serializeAnswer(question.getOptionsJson()),
                question.getDisplayOrder(),
                question.getIsActive()
        );
    }

    private LeadActivityResponse toActivityResponse(LeadEvent event, String actorName) {
        return new LeadActivityResponse(
                event.getId(),
                toActivityType(event.getType()),
                toTitle(event),
                resolveDescription(event),
                actorName,
                event.getCreatedAt()
        );
    }

    private String toActivityType(LeadEventType eventType) {
        return switch (eventType) {
            case NOTE_ADDED -> "note";
            case CALL_LOGGED -> "call";
            case TASK_CREATED, TASK_COMPLETED -> "task";
            case STATUS_CHANGED -> "status_change";
            case EMAIL_SENT -> "email";
            default -> "note";
        };
    }

    private String toTitle(LeadEvent event) {
        return switch (event.getType()) {
            case NOTE_ADDED -> "Notă adăugată";
            case CALL_LOGGED -> "Apel înregistrat";
            case TASK_CREATED -> "Task creat";
            case TASK_COMPLETED -> "Task finalizat";
            case STATUS_CHANGED -> "Status schimbat";
            case EMAIL_SENT -> "Email trimis";
            default -> event.getSummary() == null ? "Activitate" : event.getSummary();
        };
    }

    private String resolveDescription(LeadEvent event) {
        JsonNode payload = event.getPayload();
        if (payload != null) {
            if (payload.has("text") && payload.get("text").isTextual()) {
                return payload.get("text").asText();
            }
            if (payload.has("description") && payload.get("description").isTextual()) {
                return payload.get("description").asText();
            }
            if (payload.has("title") && payload.get("title").isTextual()) {
                return payload.get("title").asText();
            }
            try {
                return objectMapper.writeValueAsString(payload);
            } catch (JsonProcessingException ignored) {
                return event.getSummary();
            }
        }
        return event.getSummary();
    }

    private Map<UUID, String> resolveActorNames(List<LeadEvent> events) {
        Set<UUID> actorIds = events.stream()
                .map(LeadEvent::getActorUserId)
                .filter(id -> id != null)
                .collect(java.util.stream.Collectors.toSet());
        if (actorIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, String> names = new HashMap<>();
        userRepository.findAllById(actorIds).forEach(user -> names.put(user.getId(), buildActorName(user)));
        return names;
    }

    private String buildActorName(User user) {
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName().trim();
        }
        String firstName = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String lastName = user.getLastName() == null ? "" : user.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        if (!fullName.isEmpty()) {
            return fullName;
        }
        return user.getEmail();
    }

    private List<String> findRelevantBlackBookSnippets(
            UUID companyId,
            Lead lead,
            List<String> noteTexts,
            ConversationState conversationState,
            CategorizedNotes categorizedNotes,
            List<String> formAnswerSummaries,
            KbDocument activeKbDocument
    ) {
        String query = buildHybridSearchQuery(lead, noteTexts, conversationState, categorizedNotes, formAnswerSummaries)
                .toLowerCase(Locale.ROOT);
        List<String> hostedSnippets = findHostedBlackBookSnippets(query);
        if (!hostedSnippets.isEmpty()) {
            return hostedSnippets;
        }

        KbDocument document = activeKbDocument;
        if (document == null) {
            return List.of();
        }
        List<KbChunk> chunks = kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId());
        if (chunks.isEmpty()) {
            return List.of();
        }

        Set<String> tokens = tokenize(query);
        List<Double> queryEmbedding = embedQuerySafely(query);
        if (tokens.isEmpty() && queryEmbedding.isEmpty()) {
            return chunks.stream().map(KbChunk::getContent).limit(3).toList();
        }

        int maxLexicalScore = chunks.stream()
                .mapToInt(chunk -> lexicalScore(tokens, chunk.getContent()))
                .max()
                .orElse(0);

        return chunks.stream()
                .map(chunk -> scoreChunk(chunk, tokens, maxLexicalScore, queryEmbedding))
                .filter(this::hasHybridMatch)
                .sorted((a, b) -> Double.compare(b.hybridScore(), a.hybridScore()))
                .limit(3)
                .map(HybridChunkScore::content)
                .toList();
    }

    private List<String> findHostedBlackBookSnippets(String query) {
        if (!openAiClient.hasHostedVectorStore() || query == null || query.isBlank()) {
            return List.of();
        }
        try {
            return openAiClient.searchVectorStore(query, 3).stream()
                    .map(snippet -> truncate(snippet, 1200))
                    .toList();
        } catch (Exception exception) {
            LOG.warn("Hosted vector search fallback triggered: {}", exception.getMessage());
            return List.of();
        }
    }

    private HybridChunkScore scoreChunk(
            KbChunk chunk,
            Set<String> tokens,
            int maxLexicalScore,
            List<Double> queryEmbedding
    ) {
        int lexicalScore = lexicalScore(tokens, chunk.getContent());
        double normalizedLexicalScore = maxLexicalScore > 0
                ? (double) lexicalScore / maxLexicalScore
                : 0.0;
        double vectorScore = similarityToChunk(queryEmbedding, chunk.getEmbeddingText());
        double normalizedVectorScore = normalizeCosineSimilarity(vectorScore);
        double hybridScore = (HYBRID_LEXICAL_WEIGHT * normalizedLexicalScore)
                + (HYBRID_VECTOR_WEIGHT * normalizedVectorScore);
        if (lexicalScore > 0 && vectorScore >= MIN_VECTOR_SIMILARITY) {
            hybridScore += 0.10;
        }
        return new HybridChunkScore(
                chunk.getContent(),
                lexicalScore,
                vectorScore,
                hybridScore
        );
    }

    private boolean hasHybridMatch(HybridChunkScore scoredChunk) {
        return scoredChunk.lexicalScore() > 0 || scoredChunk.vectorScore() >= MIN_VECTOR_SIMILARITY;
    }

    private List<Double> embedQuerySafely(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        try {
            return openAiClient.embed(query);
        } catch (Exception exception) {
            LOG.warn("Hybrid snippet retrieval falling back to lexical-only matching: {}", exception.getMessage());
            return List.of();
        }
    }

    private CategorizedNotes categorizeNotes(List<LeadEvent> events) {
        Map<LeadNoteCategory, List<String>> grouped = new LinkedHashMap<>();
        for (LeadNoteCategory category : LeadNoteCategory.values()) {
            grouped.put(category, new ArrayList<>());
        }
        List<String> uncategorized = new ArrayList<>();
        if (events == null) {
            return new CategorizedNotes(grouped, uncategorized);
        }
        events.stream()
                .filter(event -> event.getType() == LeadEventType.NOTE_ADDED)
                .forEach(event -> {
                    String text = resolveDescription(event);
                    if (text == null || text.isBlank()) {
                        return;
                    }
                    LeadNoteCategory category = extractNoteCategory(event.getPayload());
                    if (category == null) {
                        uncategorized.add(text);
                        return;
                    }
                    grouped.get(category).add(text);
                });
        return new CategorizedNotes(grouped, uncategorized);
    }

    private LeadNoteCategory extractNoteCategory(JsonNode payload) {
        if (payload == null || !payload.has("category") || !payload.get("category").isTextual()) {
            return null;
        }
        try {
            return LeadNoteCategory.valueOf(payload.get("category").asText().trim());
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private ConversationState extractConversationState(
            List<LeadEvent> events,
            List<String> noteTexts,
            CategorizedNotes categorizedNotes,
            List<String> formAnswerSummaries
    ) {
        if (events == null || events.isEmpty()) {
            return fallbackConversationState(noteTexts, categorizedNotes);
        }

        String timeline = buildTimelineSummary(events, categorizedNotes, formAnswerSummaries);
        try {
            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", "Respond with strict JSON only."),
                    Map.of("role", "user", "content", """
                            Analyze this B2B sales lead timeline.
                            Return STRICT JSON only with keys:
                            - confirmedFacts (array of max 5 short strings)
                            - currentObjection (string)
                            - conversationStage (string)
                            - nextExpectedStep (string)
                            - openQuestions (array of max 4 short strings)
                            - confidence (number 0..1)

                            Rules:
                            - Extract only what is reasonably supported by the timeline.
                            - Do not invent budget, dates, or commitments.
                            - If something is unclear, leave it empty.
                            - Language: Romanian.

                            Timeline:
                            %s
                            """.formatted(timeline))
            );
            String raw = openAiClient.chat(messages, 0.1);
            JsonNode json = parseJsonSafely(raw);
            ConversationState parsed = new ConversationState(
                    extractTextArray(json, "confirmedFacts", 5),
                    extractNonBlankOrDefault(json, "currentObjection", ""),
                    extractNonBlankOrDefault(json, "conversationStage", ""),
                    extractNonBlankOrDefault(json, "nextExpectedStep", ""),
                    extractTextArray(json, "openQuestions", 4),
                    extractDoubleOrDefault(json, "confidence", 0.0)
            );
            return parsed.isMeaningful() ? parsed : fallbackConversationState(noteTexts, categorizedNotes);
        } catch (Exception exception) {
            LOG.warn("Conversation state extraction fallback triggered: {}", exception.getMessage());
            return fallbackConversationState(noteTexts, categorizedNotes);
        }
    }

    private String buildTimelineSummary(
            List<LeadEvent> events,
            CategorizedNotes categorizedNotes,
            List<String> formAnswerSummaries
    ) {
        String timelineLines = events.stream()
                .limit(50)
                .map(event -> {
                    String timestamp = event.getCreatedAt() == null ? "unknown-time" : event.getCreatedAt().toString();
                    String description = resolveDescription(event);
                    if (description == null || description.isBlank()) {
                        description = "-";
                    }
                    String categoryLabel = event.getType() == LeadEventType.NOTE_ADDED
                            ? noteCategoryLabel(extractNoteCategory(event.getPayload()))
                            : "";
                    return categoryLabel.isBlank()
                            ? "* %s | %s | %s".formatted(timestamp, toTitle(event), description)
                            : "* %s | %s | [%s] %s".formatted(timestamp, toTitle(event), categoryLabel, description);
                })
                .collect(java.util.stream.Collectors.joining("\n"));
        String categorizedSummary = categorizedNotes.toPromptSection();
        String formAnswersSummary = formAnswerSummaries == null || formAnswerSummaries.isEmpty()
                ? ""
                : "Răspunsuri formular:\n- " + String.join("\n- ", formAnswerSummaries);
        String structuredSummary = Stream.of(formAnswersSummary, categorizedSummary)
                .filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining("\n\n"));
        return structuredSummary.isBlank() ? timelineLines : structuredSummary + "\n\nCronologie:\n" + timelineLines;
    }

    private ConversationState fallbackConversationState(List<String> noteTexts, CategorizedNotes categorizedNotes) {
        String combined = String.join(" ", noteTexts).toLowerCase(Locale.ROOT);
        String currentObjection = "";
        List<String> objectionNotes = categorizedNotes.notesFor(LeadNoteCategory.TYPE_OBJECTION);
        List<String> confirmationNotes = categorizedNotes.notesFor(LeadNoteCategory.TYPE_CONFIRMATION);
        List<String> nextStepNotes = categorizedNotes.notesFor(LeadNoteCategory.TYPE_NEXT_STEP);
        if (!objectionNotes.isEmpty()) {
            currentObjection = objectionNotes.get(0);
        } else if (combined.contains("pre") && combined.contains("mare")) {
            currentObjection = "Prețul pare prea mare pentru client.";
        } else if (combined.contains("scump")) {
            currentObjection = "Clientul percepe oferta ca fiind scumpă.";
        } else if (combined.contains("buget")) {
            currentObjection = "Există o discuție activă despre buget.";
        }

        String conversationStage = noteTexts.isEmpty()
                ? "Lead nou, fără context conversațional suficient."
                : !confirmationNotes.isEmpty()
                ? "După o etapă de confirmare, înainte de pasul următor operațional."
                : "După interacțiuni inițiale, înainte de următorul pas clar confirmat.";

        String nextExpectedStep = !nextStepNotes.isEmpty()
                ? nextStepNotes.get(0)
                : currentObjection.isBlank()
                ? "Clarifică următorul pas concret și confirmă cine decide."
                : "Răspunde la obiecția curentă și reconfirmă următorul pas.";

        List<String> openQuestions = noteTexts.isEmpty()
                ? List.of("Care este problema principală de rezolvat?")
                : List.of("Ce lipsește ca lead-ul să avanseze la pasul următor?");

        return new ConversationState(
                confirmationNotes.stream().limit(3).toList(),
                currentObjection,
                conversationStage,
                nextExpectedStep,
                openQuestions,
                0.35
        );
    }

    private String buildHybridSearchQuery(
            Lead lead,
            List<String> noteTexts,
            ConversationState conversationState,
            CategorizedNotes categorizedNotes,
            List<String> formAnswerSummaries
    ) {
        List<String> queryParts = new ArrayList<>();
        queryParts.add(lead.getStatus() == null ? "" : lead.getStatus());
        queryParts.add(lead.getSource() == null ? "" : lead.getSource());
        queryParts.add(String.join(" ", noteTexts));
        queryParts.add(String.join(" ", formAnswerSummaries));
        queryParts.add(conversationState.conversationStage());
        queryParts.add(conversationState.currentObjection());
        queryParts.add(conversationState.nextExpectedStep());
        queryParts.add(String.join(" ", conversationState.confirmedFacts()));
        queryParts.add(String.join(" ", conversationState.openQuestions()));
        queryParts.add(String.join(" ", categorizedNotes.notesFor(LeadNoteCategory.TYPE_DISCOVERY)));
        queryParts.add(String.join(" ", categorizedNotes.notesFor(LeadNoteCategory.TYPE_CONFIRMATION)));
        queryParts.add(String.join(" ", categorizedNotes.notesFor(LeadNoteCategory.TYPE_OBJECTION)));
        queryParts.add(String.join(" ", categorizedNotes.notesFor(LeadNoteCategory.TYPE_NEXT_STEP)));
        return queryParts.stream()
                .filter(part -> part != null && !part.isBlank())
                .collect(java.util.stream.Collectors.joining(" "));
    }

    private String buildInsightsCacheKey(Lead lead, KbDocument activeKbDocument, Instant latestFeedbackAt, Instant latestAnswerAt) {
        String activityToken = lead.getLastActivityAt() != null
                ? lead.getLastActivityAt().toString()
                : lead.getSubmittedAt() != null ? lead.getSubmittedAt().toString() : "no-activity";
        String kbToken;
        if (openAiClient.hasHostedVectorStore()) {
            kbToken = "hosted:" + openAiClient.getVectorStoreId();
        } else {
            kbToken = activeKbDocument == null
                    ? "no-kb"
                    : activeKbDocument.getId() + ":" + (activeKbDocument.getUpdatedAt() == null ? "no-update" : activeKbDocument.getUpdatedAt());
        }
        String feedbackToken = latestFeedbackAt == null ? "no-feedback" : latestFeedbackAt.toString();
        String answersToken = latestAnswerAt == null ? "no-answers" : latestAnswerAt.toString();
        return lead.getId() + "|" + activityToken + "|" + kbToken + "|" + feedbackToken + "|" + answersToken;
    }

    private boolean isSnapshotStale(
            LeadAiInsightSnapshot snapshot,
            Lead lead,
            KbDocument activeKbDocument,
            Instant latestFeedbackAt,
            Instant latestAnswerAt
    ) {
        if (snapshot == null) {
            return true;
        }
        Instant snapshotReference = snapshot.getLastRegeneratedAt() != null
                ? snapshot.getLastRegeneratedAt()
                : snapshot.getGeneratedAt();
        if (snapshotReference == null) {
            return true;
        }
        String currentKey = buildInsightsCacheKey(lead, activeKbDocument, latestFeedbackAt, latestAnswerAt);
        String snapshotKey = buildInsightsCacheKey(
                leadSnapshotView(lead, snapshotReference),
                activeKbDocumentSnapshotView(activeKbDocument, snapshotReference),
                minInstant(latestFeedbackAt, snapshotReference),
                minInstant(latestAnswerAt, snapshotReference)
        );
        return !currentKey.equals(snapshotKey);
    }

    private Lead leadSnapshotView(Lead lead, Instant snapshotReference) {
        Lead snapshotLead = new Lead();
        snapshotLead.setId(lead.getId());
        snapshotLead.setSubmittedAt(lead.getSubmittedAt());
        snapshotLead.setLastActivityAt(
                lead.getLastActivityAt() != null && lead.getLastActivityAt().isAfter(snapshotReference)
                        ? snapshotReference
                        : lead.getLastActivityAt()
        );
        return snapshotLead;
    }

    private KbDocument activeKbDocumentSnapshotView(KbDocument activeKbDocument, Instant snapshotReference) {
        if (activeKbDocument == null) {
            return null;
        }
        KbDocument snapshotDocument = new KbDocument();
        snapshotDocument.setId(activeKbDocument.getId());
        snapshotDocument.setUpdatedAt(
                activeKbDocument.getUpdatedAt() != null && activeKbDocument.getUpdatedAt().isAfter(snapshotReference)
                        ? snapshotReference
                        : activeKbDocument.getUpdatedAt()
        );
        return snapshotDocument;
    }

    private Instant minInstant(Instant candidate, Instant upperBound) {
        if (candidate == null) {
            return null;
        }
        return candidate.isAfter(upperBound) ? upperBound : candidate;
    }

    private String summarizeRecentInsights(List<LeadAiInsightMemory> recentMemories) {
        if (recentMemories == null || recentMemories.isEmpty()) {
            return "";
        }
        return recentMemories.stream()
                .map(memory -> {
                    String feedback = memory.getFeedbackStatus() == null
                            ? LeadInsightFeedbackStatus.NONE.name()
                            : memory.getFeedbackStatus().name();
                    String note = memory.getFeedbackNote() == null || memory.getFeedbackNote().isBlank()
                            ? ""
                            : " | feedbackNote=" + memory.getFeedbackNote().trim();
                    return "score=%s | action=%s | feedback=%s%s".formatted(
                            memory.getScore(),
                            truncate(memory.getRecommendedAction(), 180),
                            feedback,
                            note
                    );
                })
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private LeadAiInsightMemory saveInsightMemory(Lead lead, int score, String recommendedAction, String suggestedApproach) {
        LeadAiInsightMemory memory = new LeadAiInsightMemory();
        memory.setLead(lead);
        memory.setCompany(lead.getCompany());
        memory.setScore(score);
        memory.setRecommendedAction(recommendedAction);
        memory.setSuggestedApproach(suggestedApproach);
        memory.setFeedbackStatus(LeadInsightFeedbackStatus.NONE);
        return leadAiInsightMemoryRepository.save(memory);
    }

    private void saveInsightSnapshot(Lead lead, LeadAiInsightsResponse response) {
        LeadAiInsightSnapshot snapshot = leadAiInsightSnapshotRepository
                .findByLeadIdAndCompanyId(lead.getId(), lead.getCompany().getId())
                .orElseGet(LeadAiInsightSnapshot::new);
        if (snapshot.getId() == null) {
            snapshot.setId(UUID.randomUUID());
        }
        snapshot.setLead(lead);
        snapshot.setCompany(lead.getCompany());
        snapshot.setLatestInsightMemoryId(response.insightId());
        snapshot.setScore(response.score());
        snapshot.setClientScore(response.clientScore());
        snapshot.setNextCallCloseProbability(response.nextCallCloseProbability());
        snapshot.setRelationshipSentiment(response.relationshipSentiment());
        snapshot.setRelationshipRiskLevel(response.relationshipRiskLevel());
        snapshot.setRelationshipTrend(response.relationshipTrend());
        snapshot.setRelationshipKeyBlocker(response.relationshipKeyBlocker());
        snapshot.setConfidenceScore(response.confidenceScore());
        snapshot.setConfidenceLevel(response.confidenceLevel());
        snapshot.setGuidanceSource(response.guidanceSource());
        snapshot.setRecommendedAction(response.recommendedAction());
        snapshot.setSuggestedApproach(response.suggestedApproach());
        snapshot.setNextBestActionJson(writeJson(response.nextBestAction()));
        snapshot.setWhatChangedJson(writeJson(response.whatChanged()));
        snapshot.setExplainabilityJson(writeJson(response.explainability()));
        snapshot.setScoreFactorsJson(writeJson(response.scoreFactors()));
        snapshot.setGeneratedAt(response.generatedAt());
        snapshot.setLastRegeneratedAt(Instant.now());
        leadAiInsightSnapshotRepository.save(snapshot);
    }

    private LeadAiInsightsResponse toResponse(LeadAiInsightSnapshot snapshot) {
        return new LeadAiInsightsResponse(
                snapshot.getLatestInsightMemoryId(),
                snapshot.getScore(),
                snapshot.getClientScore(),
                snapshot.getNextCallCloseProbability(),
                snapshot.getRelationshipSentiment(),
                snapshot.getRelationshipRiskLevel(),
                snapshot.getRelationshipTrend(),
                snapshot.getRelationshipKeyBlocker(),
                snapshot.getConfidenceScore(),
                snapshot.getConfidenceLevel(),
                snapshot.getGuidanceSource(),
                readJson(snapshot.getNextBestActionJson(), LeadAiNextBestActionResponse.class),
                readJson(snapshot.getWhatChangedJson(), LeadAiWhatChangedResponse.class),
                readJson(snapshot.getExplainabilityJson(), LeadAiExplainabilityResponse.class),
                snapshot.getRecommendedAction(),
                snapshot.getSuggestedApproach(),
                readJsonList(snapshot.getScoreFactorsJson(), LeadAiInsightFactorResponse.class),
                snapshot.getGeneratedAt()
        );
    }

    private String writeJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize AI insight snapshot", exception);
        }
    }

    private <T> T readJson(String value, Class<T> type) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(value, type);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse AI insight snapshot", exception);
        }
    }

    private <T> List<T> readJsonList(String value, Class<T> itemType) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(
                    value,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, itemType)
            );
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse AI insight snapshot list", exception);
        }
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value == null ? "" : value;
        }
        return value.substring(0, maxLength - 3) + "...";
    }

    private String normalizeEnumLike(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    private String normalizeForMatch(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9 ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private LeadAiNextBestActionResponse mapNextBestAction(
            int score,
            RelationshipSignal relationshipSignal,
            AnswerSignals answerSignals,
            String guidanceSource,
            AiGuidance aiGuidance,
            GapAnalysis gapAnalysis,
            ConversationState conversationState
    ) {
        if ("frustrated".equals(relationshipSignal.overallSentiment())
                && "decreasing".equals(relationshipSignal.trend())) {
            String reason = !relationshipSignal.keyBlocker().isBlank()
                    ? relationshipSignal.keyBlocker()
                    : "Lead-ul pierde încredere și are nevoie de o intervenție personală imediată.";
            return new LeadAiNextBestActionResponse(
                    "recover_relationship",
                    "urgent",
                    reason,
                    "Lead-ul este frustrat, iar trendul conversației scade; dacă nu intervii acum, probabilitatea de stagnare crește.",
                    "today",
                    "phone_and_personal_message"
            );
        }

        if (aiGuidance != null && aiGuidance.strategy() != null) {
            StrategicRecommendation strategy = aiGuidance.strategy();
            LeadAction action = strategy.nextBestAction();
            String timing = action != null && !action.timing().isBlank() ? action.timing() : "within_24h";
            String channel = action != null && !action.channel().isBlank() ? action.channel() : "apel";
            return new LeadAiNextBestActionResponse(
                    action != null && !action.type().isBlank() ? action.type() : "clarify_next_step",
                    action != null && !action.priority().isBlank() ? action.priority() : "medium",
                    !strategy.reason().isBlank() ? strategy.reason() : "Este nevoie de un pas următor concret.",
                    buildWhyNow(score, relationshipSignal, answerSignals, strategy),
                    timing,
                    channel
            );
        }

        String recommendedAction = aiGuidance == null ? "" : aiGuidance.recommendedAction();
        String suggestedApproach = aiGuidance == null ? "" : aiGuidance.suggestedApproach();
        String normalizedAction = normalizeForMatch(recommendedAction + " " + suggestedApproach);
        String actionType = "clarify_next_step";
        if ("high".equals(relationshipSignal.riskLevel()) || "at_risk".equals(relationshipSignal.overallSentiment())) {
            actionType = "recover_relationship";
        } else if (normalizedAction.contains("demo") || normalizedAction.contains("prezent")) {
            actionType = "prepare_demo";
        } else if (normalizedAction.contains("call") || normalizedAction.contains("apel") || normalizedAction.contains("qualification")) {
            actionType = "schedule_call";
        } else if (normalizedAction.contains("task") || normalizedAction.contains("follow up")) {
            actionType = "create_follow_up_task";
        } else if (normalizedAction.contains("agenda") || normalizedAction.contains("technical") || normalizedAction.contains("tehnic")) {
            actionType = "prepare_materials";
        }

        String priority = score >= 80 || "high".equals(relationshipSignal.riskLevel())
                ? "urgent"
                : score >= 55 ? "high" : "normal";
        if ("fallback".equals(guidanceSource)) {
            priority = "normal";
        }

        String reason = !relationshipSignal.keyBlocker().isBlank()
                ? relationshipSignal.keyBlocker()
                : !gapAnalysis.insistOn().isEmpty()
                ? gapAnalysis.insistOn().get(0)
                : !conversationState.openQuestions().isEmpty()
                ? conversationState.openQuestions().get(0)
                : "Needs a concrete next step.";

        String whyNow = buildWhyNow(score, relationshipSignal, answerSignals, null);

        String deadlineHint = switch (priority) {
            case "urgent" -> "today";
            case "high" -> "within_24h";
            default -> "this_week";
        };

        String channel = "recover_relationship".equals(actionType)
                ? "phone_and_personal_message"
                : "schedule_call".equals(actionType)
                ? "phone"
                : "email_or_task";
        return new LeadAiNextBestActionResponse(actionType, priority, reason, whyNow, deadlineHint, channel);
    }

    private LeadAiExplainabilityResponse buildExplainability(
            List<LeadAiInsightFactorResponse> factors,
            List<String> kbSnippets,
            LeadAiWhatChangedResponse whatChanged
    ) {
        List<String> basedOnSignals = factors.stream()
                .limit(4)
                .map(factor -> "%s: %s".formatted(factor.label(), factor.detail()))
                .toList();
        List<String> kbEvidence = kbSnippets.stream()
                .limit(2)
                .map(snippet -> truncate(snippet, 180))
                .toList();
        String whyThisInsight = !basedOnSignals.isEmpty()
                ? basedOnSignals.get(0)
                : whatChanged != null && !whatChanged.changes().isEmpty()
                ? whatChanged.changes().get(0)
                : "Insight is based on current lead state and recent timeline context.";
        return new LeadAiExplainabilityResponse(
                whyThisInsight,
                basedOnSignals,
                kbEvidence
        );
    }

    private LeadAiWhatChangedResponse buildWhatChanged(
            List<LeadAiInsightMemory> recentMemories,
            RelationshipSignal relationshipSignal,
            GapAnalysis gapAnalysis,
            ConversationState conversationState
    ) {
        String previousRecommendation = null;
        String previousFeedbackStatus = null;
        List<String> changes = new ArrayList<>();
        if (recentMemories != null && !recentMemories.isEmpty()) {
            LeadAiInsightMemory previous = recentMemories.get(0);
            previousRecommendation = truncate(previous.getRecommendedAction(), 140);
            changes.add("Previous recommendation: " + previousRecommendation);
            if (previous.getFeedbackStatus() != null && previous.getFeedbackStatus() != LeadInsightFeedbackStatus.NONE) {
                previousFeedbackStatus = previous.getFeedbackStatus().name();
                changes.add("Manager feedback on previous recommendation: " + previousFeedbackStatus);
            }
        }
        if (!relationshipSignal.keyBlocker().isBlank()) {
            changes.add("Current blocker: " + relationshipSignal.keyBlocker());
        }
        if (!conversationState.nextExpectedStep().isBlank()) {
            changes.add("Current next step: " + conversationState.nextExpectedStep());
        }
        if (!gapAnalysis.missingInformation().isEmpty()) {
            changes.add("Missing information now: " + gapAnalysis.missingInformation().get(0));
        }
        return new LeadAiWhatChangedResponse(
                previousRecommendation,
                previousFeedbackStatus,
                changes.stream().distinct().limit(4).toList()
        );
    }

    private GapAnalysis buildGapAnalysis(
            ConversationState conversationState,
            CategorizedNotes categorizedNotes,
            List<String> kbSnippets
    ) {
        if (kbSnippets.isEmpty()) {
            return fallbackGapAnalysis(conversationState, categorizedNotes);
        }
        try {
            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", "Respond with strict JSON only."),
                    Map.of("role", "user", "content", """
                            You are analyzing a B2B sales gap between playbook requirements and known lead context.
                            Return STRICT JSON only with keys:
                            - knownAlready (array of max 5 short strings)
                            - doNotAskAgain (array of max 4 short strings)
                            - insistOn (array of max 4 short strings)
                            - missingInformation (array of max 5 short strings)

                            Rules:
                            - `knownAlready` must contain only confirmed information.
                            - `doNotAskAgain` must list topics that are already settled.
                            - `insistOn` must list what the rep should push to clarify next.
                            - `missingInformation` must be concrete unknowns required by the playbook.
                            - Language: Romanian.

                            Known facts:
                            %s

                            Open questions:
                            %s

                            Categorized notes:
                            %s

                            Playbook snippets:
                            %s
                            """.formatted(
                            conversationState.confirmedFacts().isEmpty() ? "none" : String.join(" | ", conversationState.confirmedFacts()),
                            conversationState.openQuestions().isEmpty() ? "none" : String.join(" | ", conversationState.openQuestions()),
                            categorizedNotes.toPromptSection().isBlank() ? "none" : categorizedNotes.toPromptSection(),
                            String.join("\n---\n", kbSnippets)
                    ))
            );
            String raw = openAiClient.chat(messages, 0.15);
            JsonNode json = parseJsonSafely(raw);
            GapAnalysis parsed = new GapAnalysis(
                    extractTextArray(json, "knownAlready", 5),
                    extractTextArray(json, "doNotAskAgain", 4),
                    extractTextArray(json, "insistOn", 4),
                    extractTextArray(json, "missingInformation", 5)
            );
            return parsed.isMeaningful() ? parsed : fallbackGapAnalysis(conversationState, categorizedNotes);
        } catch (Exception exception) {
            LOG.warn("Gap analysis fallback triggered: {}", exception.getMessage());
            return fallbackGapAnalysis(conversationState, categorizedNotes);
        }
    }

    private GapAnalysis fallbackGapAnalysis(ConversationState conversationState, CategorizedNotes categorizedNotes) {
        List<String> knownAlready = new ArrayList<>(conversationState.confirmedFacts());
        if (knownAlready.isEmpty()) {
            knownAlready.addAll(categorizedNotes.notesFor(LeadNoteCategory.TYPE_CONFIRMATION).stream().limit(3).toList());
        }

        List<String> doNotAskAgain = knownAlready.stream().limit(3).toList();
        List<String> insistOn = !conversationState.openQuestions().isEmpty()
                ? conversationState.openQuestions().stream().limit(3).toList()
                : categorizedNotes.notesFor(LeadNoteCategory.TYPE_NEXT_STEP).stream().limit(3).toList();
        if (insistOn.isEmpty() && !conversationState.currentObjection().isBlank()) {
            insistOn = List.of(conversationState.currentObjection());
        }
        List<String> missingInformation = new ArrayList<>(insistOn);
        return new GapAnalysis(knownAlready, doNotAskAgain, insistOn, missingInformation);
    }

    private AntiRepetitionRules buildAntiRepetitionRules(
            List<LeadAiInsightMemory> recentMemories,
            ConversationState conversationState,
            GapAnalysis gapAnalysis
    ) {
        List<String> completedTopics = new ArrayList<>();
        List<String> rejectedTopics = new ArrayList<>();
        if (recentMemories != null) {
            for (LeadAiInsightMemory memory : recentMemories) {
                String action = truncate(memory.getRecommendedAction(), 120);
                if (action.isBlank()) {
                    continue;
                }
                if (memory.getFeedbackStatus() == LeadInsightFeedbackStatus.COMPLETED) {
                    completedTopics.add(action);
                } else if (memory.getFeedbackStatus() == LeadInsightFeedbackStatus.NOT_USEFUL) {
                    rejectedTopics.add(action);
                }
            }
        }
        List<String> preferredTopics = !gapAnalysis.insistOn().isEmpty()
                ? gapAnalysis.insistOn().stream().limit(3).toList()
                : conversationState.openQuestions().stream().limit(3).toList();
        return new AntiRepetitionRules(completedTopics, rejectedTopics, preferredTopics);
    }

    private GuidanceAdjustment enforceAntiRepetition(
            String recommendedAction,
            String suggestedApproach,
            AntiRepetitionRules antiRepetitionRules,
            ConversationState conversationState,
            GapAnalysis gapAnalysis
    ) {
        String normalizedAction = normalizeForMatch(recommendedAction);
        boolean repeatsCompleted = antiRepetitionRules.completedTopics().stream()
                .map(this::normalizeForMatch)
                .anyMatch(topic -> !topic.isBlank() && normalizedAction.contains(topic));
        boolean repeatsRejected = antiRepetitionRules.rejectedTopics().stream()
                .map(this::normalizeForMatch)
                .anyMatch(topic -> !topic.isBlank() && normalizedAction.contains(topic));
        if (!repeatsCompleted && !repeatsRejected) {
            return new GuidanceAdjustment(recommendedAction, suggestedApproach, false, "");
        }

        String nextTopic = !antiRepetitionRules.preferredTopics().isEmpty()
                ? antiRepetitionRules.preferredTopics().get(0)
                : !gapAnalysis.missingInformation().isEmpty()
                ? gapAnalysis.missingInformation().get(0)
                : !conversationState.openQuestions().isEmpty()
                ? conversationState.openQuestions().get(0)
                : "următorul pas clar din conversație";
        String adjustedAction = "Nu relua pasul anterior. Concentrează-te acum pe: " + nextTopic;
        String adjustedApproach = suggestedApproach
                + "\nGuardrail anti-repetiție: evită să reiei o recomandare deja "
                + (repeatsCompleted ? "completată" : "marcată ca inutilă")
                + " și mută discuția pe următorul gol real.";
        String reason = repeatsCompleted
                ? "A blocked recommendation matched a previously completed action."
                : "A blocked recommendation matched a previously rejected action.";
        return new GuidanceAdjustment(adjustedAction, adjustedApproach, true, reason);
    }

    private ConfidenceAssessment assessConfidence(
            RelationshipSignal relationshipSignal,
            ConversationState conversationState,
            GapAnalysis gapAnalysis,
            List<String> kbSnippets
    ) {
        double score = 0.25;
        score += Math.min(0.30, Math.max(0.0, conversationState.confidence()) * 0.30);
        if (!gapAnalysis.missingInformation().isEmpty() || !gapAnalysis.doNotAskAgain().isEmpty()) {
            score += 0.20;
        }
        if (!kbSnippets.isEmpty()) {
            score += 0.15;
        }
        if (!relationshipSignal.isFallback()) {
            score += 0.10;
        }
        score = Math.max(0.0, Math.min(1.0, score));

        String level = score >= 0.80 ? "high" : score >= MIN_AI_GUIDANCE_CONFIDENCE ? "medium" : "low";
        boolean shouldUseFallback = score < MIN_AI_GUIDANCE_CONFIDENCE;
        String fallbackReason = shouldUseFallback
                ? "AI confidence is low; returning safe fallback guidance."
                : "";
        return new ConfidenceAssessment(score, level, shouldUseFallback, fallbackReason);
    }

    private RelationshipSignal analyzeRelationshipSignal(
            List<LeadEvent> events,
            CategorizedNotes categorizedNotes,
            Lead lead
    ) {
        List<LeadEvent> signalEvents = events == null ? List.of() : events.stream().limit(10).toList();
        if (signalEvents.isEmpty()) {
            return fallbackRelationshipSignal(categorizedNotes, lead);
        }
        String timeline = signalEvents.stream()
                .map(event -> "%s | %s | %s".formatted(
                        event.getCreatedAt() == null ? "unknown-time" : event.getCreatedAt(),
                        toTitle(event),
                        resolveDescription(event) == null ? "-" : resolveDescription(event)
                ))
                .collect(java.util.stream.Collectors.joining("\n"));
        try {
            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", "Respond with strict JSON only."),
                    Map.of("role", "user", "content", """
                            Analyze the relationship tone for this B2B lead timeline.
                            Return STRICT JSON with keys:
                            - overall_sentiment (positive|neutral|frustrated|at_risk|stalled)
                            - risk_level (low|medium|high)
                            - key_blocker (string)
                            - trend (improving|stable|decreasing)

                            Use only the timeline. Language: English for enum values, Romanian not required.

                            Timeline:
                            %s
                            """.formatted(timeline))
            );
            String raw = openAiClient.chat(messages, 0.05);
            JsonNode json = parseJsonSafely(raw);
            String sentiment = normalizeEnumLike(extractNonBlankOrDefault(json, "overall_sentiment", "neutral"), "neutral");
            String riskLevel = normalizeEnumLike(extractNonBlankOrDefault(json, "risk_level", "low"), "low");
            String keyBlocker = extractNonBlankOrDefault(json, "key_blocker", "");
            String trend = normalizeEnumLike(extractNonBlankOrDefault(json, "trend", "stable"), "stable");
            return relationshipSignalFrom(sentiment, riskLevel, keyBlocker, trend, categorizedNotes, lead, false);
        } catch (Exception exception) {
            LOG.warn("Relationship signal fallback triggered: {}", exception.getMessage());
            return fallbackRelationshipSignal(categorizedNotes, lead);
        }
    }

    private RelationshipSignal fallbackRelationshipSignal(CategorizedNotes categorizedNotes, Lead lead) {
        String combined = categorizedNotes.toPromptSection().toLowerCase(Locale.ROOT);
        String sentiment = "neutral";
        String riskLevel = "low";
        String blocker = "";
        String trend = "stable";
        if (combined.contains("frustr") || combined.contains("nerv") || combined.contains("angry")) {
            sentiment = "frustrated";
            riskLevel = "high";
            trend = "decreasing";
            blocker = "Relationship tension";
        } else if (combined.contains("risc") || combined.contains("renun") || combined.contains("cancel")) {
            sentiment = "at_risk";
            riskLevel = "high";
            trend = "decreasing";
            blocker = "Retention risk";
        } else if (combined.contains("scump") || combined.contains("preț") || combined.contains("pret")) {
            sentiment = "stalled";
            riskLevel = "medium";
            trend = "stable";
            blocker = "Pricing concerns";
        }
        if (lead.getLastActivityAt() != null && lead.getLastActivityAt().isBefore(Instant.now().minusSeconds(3L * 24L * 3600L))
                && !"positive".equals(sentiment)) {
            sentiment = "stalled";
            riskLevel = "medium";
            trend = "decreasing";
            if (blocker.isBlank()) {
                blocker = "No positive recent progress";
            }
        }
        return relationshipSignalFrom(sentiment, riskLevel, blocker, trend, categorizedNotes, lead, true);
    }

    private RelationshipSignal relationshipSignalFrom(
            String overallSentiment,
            String riskLevel,
            String keyBlocker,
            String trend,
            CategorizedNotes categorizedNotes,
            Lead lead,
            boolean isFallback
    ) {
        double engagementMultiplier = 1.0;
        int scoreAdjustment = 0;
        String scoreImpactReason = "Relationship tone is neutral.";

        switch (overallSentiment) {
            case "positive" -> {
                engagementMultiplier = 1.1;
                scoreAdjustment += 10;
                scoreImpactReason = "Interest and trust increased in recent interactions.";
            }
            case "frustrated" -> {
                engagementMultiplier = 0.4;
                scoreAdjustment -= 8;
                scoreImpactReason = "Relationship appears tense in recent interactions.";
            }
            case "at_risk" -> {
                engagementMultiplier = 0.2;
                scoreAdjustment -= 12;
                scoreImpactReason = "Lead shows strong churn or withdrawal risk.";
            }
            case "stalled" -> {
                engagementMultiplier = 0.7;
                scoreAdjustment -= 5;
                scoreImpactReason = "Momentum appears stalled and needs recovery.";
            }
            default -> {
            }
        }
        if ("decreasing".equals(trend) && !"positive".equals(overallSentiment)) {
            scoreAdjustment -= 3;
            scoreImpactReason = scoreImpactReason + " Trend is decreasing.";
        }
        if (lead.getLastActivityAt() != null && lead.getLastActivityAt().isBefore(Instant.now().minusSeconds(3L * 24L * 3600L))
                && !"positive".equals(overallSentiment)) {
            scoreAdjustment -= 4;
            scoreImpactReason = scoreImpactReason + " No positive activity in the last 3 days.";
        }
        return new RelationshipSignal(overallSentiment, riskLevel, keyBlocker, trend, engagementMultiplier, scoreAdjustment, scoreImpactReason, isFallback);
    }

    private AiGuidance generateBlackBookGuidance(
            Lead lead,
            LeadStandardFields standardFields,
            List<String> noteTexts,
            ConversationState conversationState,
            CategorizedNotes categorizedNotes,
            List<String> formAnswerSummaries,
            String recentInsightMemory,
            GapAnalysis gapAnalysis,
            AntiRepetitionRules antiRepetitionRules,
            RelationshipSignal relationshipSignal,
            List<String> kbSnippets,
            String fallbackAction,
            String fallbackApproach
    ) {
        String prompt = """
                You are building the backend AI orchestration layer for an AI Sales Intelligence system.
                You must behave like a senior sales strategist, not a generic assistant.

                Use the lead payload and internal sales knowledge below to generate one sharp recommendation.
                Base every conclusion on evidence from the payload.
                Prioritize the lead payload over generic playbook retrieval when the lead details are rich and specific.
                Do not ask questions that repeat known facts.
                If emotional resistance is visible, prioritize trust and clarity before pressure.
                If urgency is weak, do not invent urgency; identify cost of inaction as missing.
                Score the client mainly on urgency to change, clarity of the problem, awareness of the problem, cost of inaction, value orientation, and decision readiness.
                If the objection details are vague, if the client is not aware of the problem, or if the client is more focused on price than on direction and transformation, score lower.
                All explanatory text returned to the frontend must be in Romanian.
                Keep machine-friendly identifiers such as next_best_action.type in snake_case.
                Return only a strict JSON object with the exact schema requested.

                Expected strict JSON schema:
                {
                  "next_best_action": {
                    "type": "",
                    "priority": "low | medium | high",
                    "timing": "",
                    "channel": ""
                  },
                  "reason": "",
                  "psychological_insight": {
                    "dominant_motivation": "",
                    "primary_blocker": "",
                    "decision_readiness": "",
                    "confidence_state": "",
                    "risk_of_stalling": ""
                  },
                  "recommended_conversation_direction": {
                    "primary_angle": "",
                    "positioning": "",
                    "tone": "",
                    "focus_points": []
                  },
                  "key_questions_to_ask": [],
                  "objection_strategy": {
                    "main_objection_to_address": "",
                    "reframe": "",
                    "supporting_points": []
                  },
                  "what_to_avoid": [],
                  "missing_information": [],
                  "scores": {
                    "client_score": 0,
                    "next_call_close_probability": 0,
                    "lead_readiness_score": 0,
                    "buying_intent_score": 0,
                    "psychological_resistance_score": 0
                  }
                }

                Lead payload:
                {
                  "lead_context": {
                    "desired_outcome": {
                      "trigger_for_call": "%s",
                      "expected_solution": [%s]
                    },
                    "current_situation": {
                      "experience_level": "%s",
                      "decision_process": "%s"
                    },
                    "problem": {
                      "main_obstacle": "%s",
                      "attempted_solutions": [%s],
                      "duration_of_problem": "%s"
                    },
                    "goal": {
                      "ideal_result": "%s",
                      "expected_timeline": "%s"
                    },
                    "cost_of_inaction": {
                      "impact_if_no_action": "%s",
                      "potential_losses": [%s],
                      "history_of_delayed_decisions": "%s"
                    },
                    "interest_level": {
                      "seriousness": "%s",
                      "decision_stage": "%s"
                    }
                  },
                  "meta": {
                    "source": "frontend_discovery_notes",
                    "language": "%s",
                    "has_missing_fields": %s
                  },
                  "crm_context": {
                    "status": "%s",
                    "source": "%s",
                    "has_email": %s,
                    "has_phone": %s,
                    "form_answers": [%s],
                    "notes": [%s],
                    "recent_insight_memory": "%s",
                    "relationship_sentiment": "%s",
                    "relationship_risk": "%s",
                    "relationship_trend": "%s",
                    "relationship_blocker": "%s",
                    "completed_topics_do_not_repeat": [%s],
                    "rejected_topics_do_not_repeat": [%s],
                    "preferred_next_topics": [%s],
                    "already_confirmed": [%s],
                    "do_not_ask_again": [%s],
                    "open_questions": [%s]
                  }
                }

                Internal sales knowledge:
                %s
                """.formatted(
                firstNonBlank(conversationState.currentObjection(), firstOf(categorizedNotes.notesFor(LeadNoteCategory.TYPE_DISCOVERY)), "unknown"),
                toQuotedArray(categorizedNotes.notesFor(LeadNoteCategory.TYPE_CONFIRMATION), 4),
                inferExperienceLevel(noteTexts, categorizedNotes),
                inferDecisionProcess(conversationState, categorizedNotes),
                firstNonBlank(relationshipSignal.keyBlocker(), conversationState.currentObjection(), firstOf(categorizedNotes.notesFor(LeadNoteCategory.TYPE_OBJECTION)), "unknown"),
                toQuotedArray(categorizedNotes.notesFor(LeadNoteCategory.TYPE_DISCOVERY), 4),
                inferProblemDuration(noteTexts),
                firstNonBlank(conversationState.nextExpectedStep(), firstOf(categorizedNotes.notesFor(LeadNoteCategory.TYPE_NEXT_STEP)), "unknown"),
                inferExpectedTimeline(noteTexts, conversationState),
                inferImpactIfNoAction(conversationState, gapAnalysis),
                toQuotedArray(gapAnalysis.missingInformation(), 4),
                inferDelayedDecisionHistory(recentInsightMemory),
                inferSeriousness(relationshipSignal, conversationState),
                inferDecisionStage(conversationState, relationshipSignal),
                inferResponseLanguage(noteTexts),
                gapAnalysis.missingInformation().isEmpty() ? "false" : "true",
                safeText(lead.getStatus(), "unknown"),
                safeText(lead.getSource(), "unknown"),
                standardFields != null && standardFields.getEmail() != null && !standardFields.getEmail().isBlank(),
                standardFields != null && standardFields.getPhone() != null && !standardFields.getPhone().isBlank(),
                toQuotedArray(formAnswerSummaries, 10),
                toQuotedArray(noteTexts, 8),
                safeText(recentInsightMemory, "none"),
                relationshipSignal.overallSentiment(),
                relationshipSignal.riskLevel(),
                relationshipSignal.trend(),
                safeText(relationshipSignal.keyBlocker(), "none"),
                toQuotedArray(antiRepetitionRules.completedTopics(), 4),
                toQuotedArray(antiRepetitionRules.rejectedTopics(), 4),
                toQuotedArray(antiRepetitionRules.preferredTopics(), 4),
                toQuotedArray(conversationState.confirmedFacts(), 5),
                toQuotedArray(gapAnalysis.doNotAskAgain(), 4),
                toQuotedArray(conversationState.openQuestions(), 4),
                kbSnippets.isEmpty() ? "none" : String.join("\n---\n", kbSnippets)
        );

        try {
            List<Map<String, String>> messages = List.of(
                    Map.of("role", "system", "content", "Respond with strict JSON only."),
                    Map.of("role", "user", "content", prompt)
            );
            String raw = openAiClient.chat(messages, 0.1);
            JsonNode json = parseJsonSafely(raw);
            StrategicRecommendation strategy = parseStrategicRecommendation(json);
            return new AiGuidance(
                    buildRecommendedAction(strategy, fallbackAction),
                    buildSuggestedApproach(strategy, fallbackApproach),
                    true,
                    strategy
            );
        } catch (Exception exception) {
            LOG.warn("AI insights fallback triggered for leadId={} reason={}", lead.getId(), exception.getMessage());
            return fallbackStructuredGuidance(noteTexts, conversationState, categorizedNotes, gapAnalysis, fallbackAction, fallbackApproach);
        }
    }

    private String serializeAnswer(JsonNode value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isTextual()) {
            return value.asText();
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize lead answer", exception);
        }
    }

    private StrategicRecommendation parseStrategicRecommendation(JsonNode json) {
        JsonNode nextBestActionNode = json.path("next_best_action");
        JsonNode psychologicalInsightNode = json.path("psychological_insight");
        JsonNode conversationDirectionNode = json.path("recommended_conversation_direction");
        JsonNode objectionStrategyNode = json.path("objection_strategy");
        JsonNode scoresNode = json.path("scores");

        return new StrategicRecommendation(
                new LeadAction(
                        extractNonBlankOrDefault(nextBestActionNode, "type", ""),
                        normalizeEnumLike(extractNonBlankOrDefault(nextBestActionNode, "priority", "medium"), "medium"),
                        extractNonBlankOrDefault(nextBestActionNode, "timing", ""),
                        extractNonBlankOrDefault(nextBestActionNode, "channel", "")
                ),
                extractNonBlankOrDefault(json, "reason", ""),
                new PsychologicalInsight(
                        extractNonBlankOrDefault(psychologicalInsightNode, "dominant_motivation", ""),
                        extractNonBlankOrDefault(psychologicalInsightNode, "primary_blocker", ""),
                        extractNonBlankOrDefault(psychologicalInsightNode, "decision_readiness", ""),
                        extractNonBlankOrDefault(psychologicalInsightNode, "confidence_state", ""),
                        extractNonBlankOrDefault(psychologicalInsightNode, "risk_of_stalling", "")
                ),
                new ConversationDirection(
                        extractNonBlankOrDefault(conversationDirectionNode, "primary_angle", ""),
                        extractNonBlankOrDefault(conversationDirectionNode, "positioning", ""),
                        extractNonBlankOrDefault(conversationDirectionNode, "tone", ""),
                        extractTextArray(conversationDirectionNode, "focus_points", 5)
                ),
                extractTextArray(json, "key_questions_to_ask", 5),
                new ObjectionStrategy(
                        extractNonBlankOrDefault(objectionStrategyNode, "main_objection_to_address", ""),
                        extractNonBlankOrDefault(objectionStrategyNode, "reframe", ""),
                        extractTextArray(objectionStrategyNode, "supporting_points", 5)
                ),
                extractTextArray(json, "what_to_avoid", 5),
                extractTextArray(json, "missing_information", 5),
                new StrategyScores(
                        extractPercentOrDefault(scoresNode, "client_score", 50),
                        extractPercentOrDefault(scoresNode, "next_call_close_probability", 35),
                        extractIntOrDefault(scoresNode, "lead_readiness_score", 5),
                        extractIntOrDefault(scoresNode, "buying_intent_score", 5),
                        extractIntOrDefault(scoresNode, "psychological_resistance_score", 5)
                )
        );
    }

    private String buildRecommendedAction(StrategicRecommendation strategy, String fallbackAction) {
        if (strategy == null) {
            return fallbackAction;
        }
        StringBuilder action = new StringBuilder();
        if (strategy.nextBestAction() != null && !strategy.nextBestAction().type().isBlank()) {
            action.append("Acțiunea recomandată: ").append(strategy.nextBestAction().type());
        }
        if (!strategy.reason().isBlank()) {
            if (action.length() > 0) {
                action.append("\n");
            }
            action.append("Motiv: ").append(strategy.reason());
        }
        if (strategy.conversationDirection() != null && !strategy.conversationDirection().primaryAngle().isBlank()) {
            if (action.length() > 0) {
                action.append("\n");
            }
            action.append("Unghi principal: ").append(strategy.conversationDirection().primaryAngle());
        }
        return action.length() > 0 ? action.toString() : fallbackAction;
    }

    private String buildSuggestedApproach(StrategicRecommendation strategy, String fallbackApproach) {
        if (strategy == null) {
            return fallbackApproach;
        }
        StringBuilder approach = new StringBuilder();
        if (strategy.conversationDirection() != null) {
            appendLabeledLine(approach, "Poziționare", strategy.conversationDirection().positioning());
            appendLabeledLine(approach, "Ton", strategy.conversationDirection().tone());
            appendList(approach, "Puncte de focus", strategy.conversationDirection().focusPoints());
        }
        if (strategy.psychologicalInsight() != null) {
            appendLabeledLine(approach, "Motivație dominantă", strategy.psychologicalInsight().dominantMotivation());
            appendLabeledLine(approach, "Blocaj principal", strategy.psychologicalInsight().primaryBlocker());
            appendLabeledLine(approach, "Pregătire pentru decizie", strategy.psychologicalInsight().decisionReadiness());
            appendLabeledLine(approach, "Stare de încredere", strategy.psychologicalInsight().confidenceState());
            appendLabeledLine(approach, "Risc de stagnare", strategy.psychologicalInsight().riskOfStalling());
        }
        if (strategy.objectionStrategy() != null) {
            appendLabeledLine(approach, "Obiecția principală", strategy.objectionStrategy().mainObjectionToAddress());
            appendLabeledLine(approach, "Reîncadrare", strategy.objectionStrategy().reframe());
            appendList(approach, "Puncte de susținere", strategy.objectionStrategy().supportingPoints());
        }
        appendList(approach, "Întrebări cheie", strategy.keyQuestionsToAsk());
        appendList(approach, "Ce trebuie evitat", strategy.whatToAvoid());
        appendList(approach, "Informații lipsă", strategy.missingInformation());
        if (strategy.scores() != null) {
            appendLabeledLine(approach, "Scor client", String.valueOf(strategy.scores().clientScore()));
            appendLabeledLine(approach, "Șansă închidere apel următor", strategy.scores().nextCallCloseProbability() + "%");
            appendLabeledLine(approach, "Scor pregătire lead", String.valueOf(strategy.scores().leadReadinessScore()));
            appendLabeledLine(approach, "Scor intenție de cumpărare", String.valueOf(strategy.scores().buyingIntentScore()));
            appendLabeledLine(approach, "Scor rezistență psihologică", String.valueOf(strategy.scores().psychologicalResistanceScore()));
        }
        appendList(approach, "Script tactic recomandat", buildTacticalScript(strategy));
        return approach.length() > 0 ? approach.toString() : fallbackApproach;
    }

    private String buildWhyNow(
            int score,
            RelationshipSignal relationshipSignal,
            AnswerSignals answerSignals,
            StrategicRecommendation strategy
    ) {
        if ("high".equals(relationshipSignal.riskLevel())) {
            return "Riscul relației este ridicat și cere intervenție imediată.";
        }
        if ("decreasing".equals(relationshipSignal.trend())) {
            return "Momentumul lead-ului scade și trebuie stabilizat înainte să intre în stagnare.";
        }
        if (answerSignals.readyToStartNow()) {
            return "Lead-ul vrea să înceapă imediat și fereastra de conversie este activă acum.";
        }
        if (answerSignals.highPriority()) {
            return "Problema este declarată ca prioritate ridicată și merită un pas concret acum.";
        }
        if (strategy != null && strategy.scores() != null && strategy.scores().buyingIntentScore() >= 7) {
            return "Intenția de cumpărare este suficient de clară pentru a avansa conversația.";
        }
        if (score >= 75) {
            return "Lead-ul este suficient de solid pentru un pas decisiv.";
        }
        return "Lead-ul are nevoie de un pas următor clar pentru a nu pierde progresul.";
    }

    private void applyAnswerSignals(AnswerSignals answerSignals, List<LeadAiInsightFactorResponse> factors) {
        if (answerSignals.readyToStartNow()) {
            factors.add(impactFactor(
                    "Start Urgency",
                    16,
                    "Lead a declarat că vrea să înceapă acum sau cât mai curând."
            ));
        }
        if (answerSignals.highPriority()) {
            factors.add(impactFactor(
                    "Problem Priority",
                    10,
                    "Lead tratează această problemă ca prioritate ridicată."
            ));
        }
        if (answerSignals.singleDecisionMaker()) {
            factors.add(impactFactor(
                    "Decision Authority",
                    8,
                    "Lead-ul este singurul decident și nu depinde de aprobări suplimentare."
            ));
        }
        if (answerSignals.budgetDeclared()) {
            factors.add(impactFactor(
                    "Budget Clarity",
                    answerSignals.lowBudget() ? 4 : 6,
                    answerSignals.lowBudget()
                            ? "Există buget declarat, dar sensibil la accesibilitate și ROI rapid."
                            : "Există buget declarat, ceea ce reduce incertitudinea comercială."
            ));
        }
        if (answerSignals.costOfInactionHigh()) {
            factors.add(impactFactor(
                    "Cost of Inaction",
                    8,
                    "Lead-ul verbalizează costul stagnării, ceea ce crește motivația de acțiune."
            ));
        }
    }

    private int calculateStrategyScoreAdjustment(StrategyScores scores) {
        int clientScoreAdjustment = Math.round((scores.clientScore() - 50) * 0.30f);
        int readinessBoost = Math.max(0, scores.leadReadinessScore() - 5) * 3;
        int intentBoost = Math.max(0, scores.buyingIntentScore() - 5) * 2;
        int resistancePenalty = Math.max(0, scores.psychologicalResistanceScore() - 6) * 2;
        return clientScoreAdjustment + readinessBoost + intentBoost - resistancePenalty;
    }

    private String buildStrategyScoreReason(StrategyScores scores) {
        return "client_score="
                + scores.clientScore()
                + ", close_probability="
                + scores.nextCallCloseProbability()
                + ", lead readiness="
                + scores.leadReadinessScore()
                + ", buying intent="
                + scores.buyingIntentScore()
                + ", psychological resistance="
                + scores.psychologicalResistanceScore()
                + ".";
    }

    private List<String> buildTacticalScript(StrategicRecommendation strategy) {
        if (strategy == null) {
            return List.of();
        }
        List<String> script = new ArrayList<>();
        String blocker = strategy.psychologicalInsight() == null ? "" : strategy.psychologicalInsight().primaryBlocker();
        String motivation = strategy.psychologicalInsight() == null ? "" : strategy.psychologicalInsight().dominantMotivation();
        String reframe = strategy.objectionStrategy() == null ? "" : strategy.objectionStrategy().reframe();
        String mainObjection = strategy.objectionStrategy() == null ? "" : strategy.objectionStrategy().mainObjectionToAddress();

        if (!blocker.isBlank()) {
            script.add("Deschidere: validează explicit blocajul \"" + blocker + "\" înainte să propui soluția.");
        }
        if (!reframe.isBlank()) {
            script.add("Reîncadrare: " + reframe);
        } else if (!mainObjection.isBlank()) {
            script.add("Reîncadrare: transformă obiecția \"" + mainObjection + "\" într-un plan de progres controlabil.");
        }
        if (!motivation.isBlank()) {
            script.add("Ancoră de valoare: leagă propunerea de motivația dominantă \"" + motivation + "\".");
        }
        List<String> supportingPoints = strategy.objectionStrategy() == null ? List.of() : strategy.objectionStrategy().supportingPoints();
        if (!supportingPoints.isEmpty()) {
            script.add("Dovadă: folosește primul exemplu concret disponibil: " + supportingPoints.get(0));
        }
        if (strategy.scores() != null && strategy.scores().leadReadinessScore() >= 7) {
            script.add("Închidere: propune un pas imediat și cu risc scăzut, nu o discuție teoretică lungă.");
        }
        return script.stream().limit(5).toList();
    }

    private AnswerSignals extractAnswerSignals(List<LeadAnswer> leadAnswers) {
        if (leadAnswers == null || leadAnswers.isEmpty()) {
            return new AnswerSignals(false, false, false, false, false, false, 0);
        }

        boolean readyToStartNow = false;
        boolean budgetDeclared = false;
        boolean lowBudget = false;
        boolean singleDecisionMaker = false;
        boolean highPriority = false;
        boolean costOfInactionHigh = false;

        for (LeadAnswer answer : leadAnswers) {
            String label = normalizeForMatch(answer.getQuestionLabelSnapshot());
            String value = normalizeAnswerValue(answer.getAnswerValue());
            if (value.isBlank()) {
                continue;
            }

            if (label.contains("buget")) {
                budgetDeclared = true;
                if (value.contains("<1000") || value.contains("sub 1000") || value.contains("sub_1000")) {
                    lowBudget = true;
                }
            }
            if ((label.contains("cand vrei sa incepi") || label.contains("când vrei să începi") || label.contains("fereastra de timp"))
                    && (value.contains("acum") || value.contains("imediat") || value.contains("cat mai curand") || value.contains("cât mai curând"))) {
                readyToStartNow = true;
            }
            if ((label.contains("singurul decident") || label.contains("alte persoane implicate") || label.contains("procesul de decizie"))
                    && (value.contains("singurul decident") || value.contains("sunt singurul") || value.contains("doar eu"))) {
                singleDecisionMaker = true;
            }
            if ((label.contains("cat de prioritar") || label.contains("cât de prioritar"))
                    && extractFirstInt(value) >= 8) {
                highPriority = true;
            }
            if ((label.contains("ce pierzi") || label.contains("costul inactiunii") || label.contains("costul inacțiunii"))
                    && (value.contains("pierd") || value.contains("stres") || value.contains("frustrare") || value.contains("oportunit"))) {
                costOfInactionHigh = true;
            }
        }

        int scoreBoost = 0;
        if (readyToStartNow) {
            scoreBoost += 16;
        }
        if (highPriority) {
            scoreBoost += 10;
        }
        if (singleDecisionMaker) {
            scoreBoost += 8;
        }
        if (budgetDeclared) {
            scoreBoost += lowBudget ? 4 : 6;
        }
        if (costOfInactionHigh) {
            scoreBoost += 8;
        }

        return new AnswerSignals(readyToStartNow, budgetDeclared, lowBudget, singleDecisionMaker, highPriority, costOfInactionHigh, scoreBoost);
    }

    private QualificationSignals extractQualificationSignals(
            List<String> noteTexts,
            List<String> formAnswerSummaries,
            AnswerSignals answerSignals
    ) {
        String combined = normalizeForMatch(String.join(" ", noteTexts) + " " + String.join(" ", formAnswerSummaries));
        boolean clearProblem = combined.contains("lipsa")
                || combined.contains("blocaj")
                || combined.contains("problema")
                || combined.contains("obstacol")
                || combined.contains("dificultat");
        boolean problemAware = answerSignals.costOfInactionHigh()
                || combined.contains("pierd")
                || combined.contains("stres")
                || combined.contains("frustr")
                || combined.contains("fara progres")
                || combined.contains("fără progres");
        boolean priceSensitive = (combined.contains("pret") || combined.contains("preț") || combined.contains("scump"))
                && !(combined.contains("valoare") || combined.contains("rezultat") || combined.contains("directie") || combined.contains("direcție"));
        boolean urgencyHigh = answerSignals.readyToStartNow()
                || answerSignals.highPriority()
                || combined.contains("cat mai curand")
                || combined.contains("cât mai curând")
                || combined.contains("acum")
                || combined.contains("1 2 luni")
                || combined.contains("1-2 luni");
        boolean valueOriented = combined.contains("valoare")
                || combined.contains("rezultate masurabile")
                || combined.contains("rezultate măsurabile")
                || combined.contains("exemple concrete")
                || combined.contains("directie clara")
                || combined.contains("direcție clară");
        boolean objectionVague = !clearProblem;

        int scoreAdjustment = 0;
        scoreAdjustment += clearProblem ? 16 : -18;
        scoreAdjustment += problemAware ? 14 : -16;
        if (urgencyHigh) {
            scoreAdjustment += 18;
        }
        if (valueOriented) {
            scoreAdjustment += 12;
        }
        if (priceSensitive) {
            scoreAdjustment -= 16;
        }
        if (answerSignals.singleDecisionMaker()) {
            scoreAdjustment += 6;
        }

        return new QualificationSignals(
                clearProblem,
                problemAware,
                priceSensitive,
                urgencyHigh,
                valueOriented,
                objectionVague,
                scoreAdjustment
        );
    }

    private void applyQualificationSignals(QualificationSignals signals, List<LeadAiInsightFactorResponse> factors) {
        factors.add(impactFactor(
                "Problem Clarity",
                signals.clearProblem() ? 16 : -18,
                signals.clearProblem()
                        ? "Lead-ul descrie clar blocajul principal și problema de rezolvat."
                        : "Detaliile despre obiecție sau problemă sunt prea vagi."
        ));
        factors.add(impactFactor(
                "Problem Awareness",
                signals.problemAware() ? 14 : -16,
                signals.problemAware()
                        ? "Lead-ul este conștient de costul stagnării și de impactul problemei."
                        : "Lead-ul nu exprimă suficient conștientizarea problemei sau a costului inacțiunii."
        ));
        if (signals.urgencyHigh()) {
            factors.add(impactFactor(
                    "Urgency To Change",
                    18,
                    "Lead-ul exprimă presiune de timp și dorință reală de schimbare."
            ));
        }
        if (signals.valueOriented()) {
            factors.add(impactFactor(
                    "Value Orientation",
                    12,
                    "Lead-ul caută direcție, rezultate și exemple concrete, nu doar preț."
            ));
        }
        if (signals.priceSensitive()) {
            factors.add(impactFactor(
                    "Price Fixation",
                    -16,
                    "Discuția pare dominată de preț, nu de direcția programului sau valoare."
            ));
        }
    }

    private LeadAiInsightFactorResponse impactFactor(String label, int impact, String detail) {
        return ratedFactor(label, impactToRating(impact), detail);
    }

    private LeadAiInsightFactorResponse ratedFactor(String label, int rating, String detail) {
        int normalizedRating = Math.max(0, Math.min(10, rating));
        String type = normalizedRating >= 7 ? "positive" : normalizedRating >= 4 ? "neutral" : "negative";
        return new LeadAiInsightFactorResponse(label, normalizedRating, type, detail);
    }

    private int impactToRating(int impact) {
        if (impact >= 18) {
            return 10;
        }
        if (impact >= 15) {
            return 9;
        }
        if (impact >= 12) {
            return 8;
        }
        if (impact >= 8) {
            return 7;
        }
        if (impact >= 4) {
            return 6;
        }
        if (impact > 0) {
            return 5;
        }
        if (impact == 0) {
            return 5;
        }
        if (impact <= -18) {
            return 1;
        }
        if (impact <= -16) {
            return 2;
        }
        if (impact <= -12) {
            return 3;
        }
        return 4;
    }

    private int calculateDerivedClientScore(int score, QualificationSignals qualificationSignals, AnswerSignals answerSignals) {
        int clientScore = 45;
        clientScore += qualificationSignals.clearProblem() ? 12 : -18;
        clientScore += qualificationSignals.problemAware() ? 10 : -16;
        clientScore += qualificationSignals.urgencyHigh() ? 14 : 0;
        clientScore += qualificationSignals.valueOriented() ? 8 : 0;
        clientScore += qualificationSignals.priceSensitive() ? -18 : 0;
        clientScore += answerSignals.singleDecisionMaker() ? 5 : 0;
        clientScore += answerSignals.readyToStartNow() ? 8 : 0;
        clientScore += Math.round((score - 50) * 0.20f);
        return clampScore(clientScore);
    }

    private int calculateFallbackCloseProbability(int clientScore, RelationshipSignal relationshipSignal, AnswerSignals answerSignals) {
        int probability = Math.round(clientScore * 0.65f);
        if ("high".equals(relationshipSignal.riskLevel())) {
            probability -= 12;
        } else if ("medium".equals(relationshipSignal.riskLevel())) {
            probability -= 6;
        }
        if (answerSignals.readyToStartNow()) {
            probability += 8;
        }
        if (answerSignals.singleDecisionMaker()) {
            probability += 5;
        }
        return clampScore(probability);
    }

    private int clampScore(int value) {
        return Math.max(0, Math.min(100, value));
    }

    private List<String> noteTextsFromAnswersAndRecentMemory(List<String> formAnswerSummaries, List<LeadAiInsightMemory> recentMemories) {
        List<String> values = new ArrayList<>(formAnswerSummaries == null ? List.of() : formAnswerSummaries);
        if (recentMemories != null) {
            recentMemories.stream()
                    .map(LeadAiInsightMemory::getRecommendedAction)
                    .filter(value -> value != null && !value.isBlank())
                    .limit(2)
                    .forEach(values::add);
        }
        return values;
    }

    private String normalizeAnswerValue(JsonNode value) {
        if (value == null || value.isNull()) {
            return "";
        }
        if (value.isTextual()) {
            return normalizeForMatch(value.asText());
        }
        if (value.isArray()) {
            List<String> values = new ArrayList<>();
            value.forEach(item -> values.add(item.asText("")));
            return normalizeForMatch(String.join(" ", values));
        }
        return normalizeForMatch(value.asText(""));
    }

    private int extractFirstInt(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("(\\d+)").matcher(value);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 0;
    }

    private void appendLabeledLine(StringBuilder target, String label, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        if (target.length() > 0) {
            target.append("\n");
        }
        target.append(label).append(": ").append(value);
    }

    private void appendList(StringBuilder target, String label, List<String> values) {
        if (values == null || values.isEmpty()) {
            return;
        }
        if (target.length() > 0) {
            target.append("\n");
        }
        target.append(label).append(":");
        for (String value : values) {
            target.append("\n- ").append(value);
        }
    }

    private String toQuotedArray(List<String> values, int maxItems) {
        if (values == null || values.isEmpty()) {
            return "";
        }
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .limit(maxItems)
                .map(value -> "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"")
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private String inferExperienceLevel(List<String> noteTexts, CategorizedNotes categorizedNotes) {
        String combined = (String.join(" ", noteTexts) + " " + categorizedNotes.toPromptSection()).toLowerCase(Locale.ROOT);
        if (combined.contains("mai încercat") || combined.contains("am incercat") || combined.contains("already tried")) {
            return "has_tried_other_solutions";
        }
        return noteTexts.isEmpty() ? "unknown" : "early exploration";
    }

    private String inferDecisionProcess(ConversationState conversationState, CategorizedNotes categorizedNotes) {
        String text = (conversationState.nextExpectedStep() + " " + categorizedNotes.toPromptSection()).toLowerCase(Locale.ROOT);
        if (text.contains("soț") || text.contains("sot") || text.contains("wife") || text.contains("husband")
                || text.contains("partner") || text.contains("intern")) {
            return "multiple stakeholders involved";
        }
        return conversationState.openQuestions().isEmpty() ? "single-threaded or unclear" : "still being clarified";
    }

    private String inferProblemDuration(List<String> noteTexts) {
        String combined = String.join(" ", noteTexts).toLowerCase(Locale.ROOT);
        if (combined.contains("luni") || combined.contains("months")) {
            return "multi_month";
        }
        if (combined.contains("săptăm") || combined.contains("saptam") || combined.contains("weeks")) {
            return "multi_week";
        }
        return "unknown";
    }

    private String inferExpectedTimeline(List<String> noteTexts, ConversationState conversationState) {
        String combined = (String.join(" ", noteTexts) + " " + conversationState.nextExpectedStep()).toLowerCase(Locale.ROOT);
        if (combined.contains("azi") || combined.contains("today")) {
            return "immediate";
        }
        if (combined.contains("săptăm") || combined.contains("saptam") || combined.contains("week")) {
            return "within_weeks";
        }
        return "unknown";
    }

    private String inferImpactIfNoAction(ConversationState conversationState, GapAnalysis gapAnalysis) {
        if (!conversationState.currentObjection().isBlank()) {
            return "Current blocker may keep the lead stuck if unresolved";
        }
        if (!gapAnalysis.missingInformation().isEmpty()) {
            return "Cost of inaction is not explicit yet";
        }
        return "unknown";
    }

    private String inferDelayedDecisionHistory(String recentInsightMemory) {
        if (recentInsightMemory == null || recentInsightMemory.isBlank()) {
            return "unknown";
        }
        return "there is recent decision history in prior insights";
    }

    private String inferSeriousness(RelationshipSignal relationshipSignal, ConversationState conversationState) {
        if ("positive".equals(relationshipSignal.overallSentiment()) && !conversationState.nextExpectedStep().isBlank()) {
            return "high";
        }
        if ("high".equals(relationshipSignal.riskLevel())) {
            return "fragile";
        }
        return "medium";
    }

    private String inferDecisionStage(ConversationState conversationState, RelationshipSignal relationshipSignal) {
        if (!conversationState.nextExpectedStep().isBlank() && "positive".equals(relationshipSignal.overallSentiment())) {
            return "ready_for_guided_next_step";
        }
        if (!conversationState.currentObjection().isBlank()) {
            return "close_to_decision_but_blocked";
        }
        return "considering";
    }

    private String inferResponseLanguage(List<String> noteTexts) {
        return "Romanian";
    }

    private List<String> summarizeLeadAnswers(List<LeadAnswer> leadAnswers) {
        if (leadAnswers == null || leadAnswers.isEmpty()) {
            return List.of();
        }
        return leadAnswers.stream()
                .map(answer -> {
                    String label = safeText(answer.getQuestionLabelSnapshot(), "Întrebare");
                    String value = serializeAnswer(answer.getAnswerValue());
                    if (value == null || value.isBlank()) {
                        return "";
                    }
                    return truncate(label + ": " + value, 240);
                })
                .filter(value -> !value.isBlank())
                .limit(10)
                .toList();
    }

    private void validateAnswerValue(LeadFormQuestion question, JsonNode value) {
        String questionType = question.getQuestionType();
        UUID questionId = question.getId();

        if (TEXT_TYPES.contains(questionType)) {
            if (!value.isTextual()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "answers[questionId=" + questionId + "].value invalid type: expected string for " + questionType);
            }
            return;
        }

        if ("single_select".equals(questionType)) {
            List<String> options = extractSelectOptions(question);
            if (!value.isTextual()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "answers[questionId=" + questionId + "].value invalid type: expected string for single_select");
            }
            if (!options.contains(value.asText())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "answers[questionId=" + questionId + "].value invalid: not in options");
            }
            return;
        }

        if ("multi_select".equals(questionType)) {
            List<String> options = extractSelectOptions(question);
            if (!value.isArray()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "answers[questionId=" + questionId + "].value invalid type: expected array for multi_select");
            }
            for (JsonNode selected : value) {
                if (!selected.isTextual()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "answers[questionId=" + questionId + "].value invalid type: expected array of strings");
                }
                if (!options.contains(selected.asText())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "answers[questionId=" + questionId + "].value invalid: contains option outside allowed list");
                }
            }
            return;
        }

        if ("number".equals(questionType) && !value.isNumber()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "answers[questionId=" + questionId + "].value invalid type: expected number");
        }

        if ("boolean".equals(questionType) && !value.isBoolean()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "answers[questionId=" + questionId + "].value invalid type: expected boolean");
        }

        if ("date".equals(questionType)) {
            if (!value.isTextual()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "answers[questionId=" + questionId + "].value invalid type: expected date string (yyyy-MM-dd)");
            }
            try {
                LocalDate.parse(value.asText());
            } catch (DateTimeParseException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "answers[questionId=" + questionId + "].value invalid date format: expected yyyy-MM-dd");
            }
        }
    }

    private JsonNode normalizeAnswerValue(LeadFormQuestion question, JsonNode value) {
        if (value == null || value.isNull()) {
            return null;
        }

        String questionType = question.getQuestionType();
        if (value.isTextual()) {
            String trimmed = value.asText().trim();
            if (trimmed.isEmpty()) {
                return null;
            }
            if (TEXT_TYPES.contains(questionType) || "single_select".equals(questionType) || "date".equals(questionType)) {
                return TextNode.valueOf(trimmed);
            }
            if ("number".equals(questionType)) {
                try {
                    return DecimalNode.valueOf(new BigDecimal(trimmed));
                } catch (NumberFormatException exception) {
                    return value;
                }
            }
            if ("boolean".equals(questionType)) {
                if ("true".equalsIgnoreCase(trimmed)) {
                    return BooleanNode.TRUE;
                }
                if ("false".equalsIgnoreCase(trimmed)) {
                    return BooleanNode.FALSE;
                }
                return value;
            }
        }

        return value;
    }

    private List<String> extractSelectOptions(LeadFormQuestion question) {
        JsonNode optionsNode = question.getOptionsJson();
        if (optionsNode == null || !optionsNode.isArray() || optionsNode.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "optionsJson invalid JSON for questionId=" + question.getId() + ": expected non-empty JSON array of strings");
        }
        List<String> options = new ArrayList<>();
        for (JsonNode optionNode : optionsNode) {
            if (!optionNode.isTextual() || optionNode.asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "optionsJson invalid JSON for questionId=" + question.getId() + ": expected non-empty JSON array of strings");
            }
            options.add(optionNode.asText());
        }
        return options;
    }

    private String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String firstOf(List<String> values) {
        return values == null || values.isEmpty() ? "" : values.get(0);
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String extractNonBlankOrDefault(JsonNode json, String field, String defaultValue) {
        if (json != null && json.has(field) && json.get(field).isTextual()) {
            String value = json.get(field).asText().trim();
            if (!value.isEmpty()) {
                return value;
            }
        }
        return defaultValue;
    }

    private String extractArrayItem(JsonNode json, String field, int index) {
        if (json == null || !json.has(field) || !json.get(field).isArray()) {
            return "";
        }
        JsonNode arr = json.get(field);
        if (arr.size() <= index || !arr.get(index).isTextual()) {
            return "";
        }
        return arr.get(index).asText().trim();
    }

    private List<String> extractTextArray(JsonNode json, String field, int maxItems) {
        if (json == null || !json.has(field) || !json.get(field).isArray()) {
            return List.of();
        }
        List<String> items = new java.util.ArrayList<>();
        for (JsonNode item : json.get(field)) {
            if (item.isTextual()) {
                String value = item.asText().trim();
                if (!value.isEmpty()) {
                    items.add(value);
                }
            }
            if (items.size() >= maxItems) {
                break;
            }
        }
        return items;
    }

    private double extractDoubleOrDefault(JsonNode json, String field, double defaultValue) {
        if (json != null && json.has(field) && json.get(field).isNumber()) {
            return json.get(field).asDouble();
        }
        return defaultValue;
    }

    private int extractIntOrDefault(JsonNode json, String field, int defaultValue) {
        if (json != null && json.has(field) && json.get(field).isNumber()) {
            return Math.max(1, Math.min(10, json.get(field).asInt()));
        }
        return defaultValue;
    }

    private int extractPercentOrDefault(JsonNode json, String field, int defaultValue) {
        if (json != null && json.has(field) && json.get(field).isNumber()) {
            return clampScore(json.get(field).asInt());
        }
        return clampScore(defaultValue);
    }

    private JsonNode parseJsonSafely(String raw) throws JsonProcessingException {
        if (raw == null || raw.isBlank()) {
            throw new JsonProcessingException("empty model response") {};
        }
        String trimmed = raw.trim();
        try {
            return objectMapper.readTree(trimmed);
        } catch (JsonProcessingException ignored) {
            int start = trimmed.indexOf('{');
            int end = trimmed.lastIndexOf('}');
            if (start >= 0 && end > start) {
                return objectMapper.readTree(trimmed.substring(start, end + 1));
            }
            throw ignored;
        }
    }

    private Lead getLeadOrThrow(UUID leadId, UUID companyId) {
        return leadRepository.findByIdAndCompanyId(leadId, companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
    }

    private Lead getLeadOrThrow(UUID leadId, CompanyMembership membership) {
        Lead lead = getLeadOrThrow(leadId, membership.getCompany().getId());
        if (membership.getRole() == com.salesway.common.enums.MembershipRole.AGENT) {
            UUID currentUserId = membership.getUser().getId();
            UUID assignedToUserId = lead.getAssignedToUserId();
            if (assignedToUserId != null && !assignedToUserId.equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found");
            }
        }
        return lead;
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Invalid page: must be >= 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Invalid size: must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    private UUID validateAssignee(UUID assigneeUserId, UUID companyId) {
        if (assigneeUserId == null) {
            return null;
        }
        companyMembershipRepository.findByCompanyIdAndUserId(companyId, assigneeUserId)
                .orElseThrow(() -> new IllegalArgumentException("assigneeUserId does not belong to current company"));
        return assigneeUserId;
    }

    private String normalizeRequired(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Set<String> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }
        Set<String> tokens = new LinkedHashSet<>();
        for (String token : text.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
            if (token.length() >= 4) {
                tokens.add(token);
            }
        }
        return tokens;
    }

    private int lexicalScore(Set<String> tokens, String content) {
        if (content == null || content.isBlank() || tokens.isEmpty()) {
            return 0;
        }
        String normalized = content.toLowerCase(Locale.ROOT);
        int score = 0;
        for (String token : tokens) {
            if (normalized.contains(token)) {
                score++;
            }
        }
        return score;
    }

    private double similarityToChunk(List<Double> queryEmbedding, String embeddingText) {
        if (queryEmbedding == null || queryEmbedding.isEmpty() || embeddingText == null || embeddingText.isBlank()) {
            return 0.0;
        }
        List<Double> chunkEmbedding = parseEmbedding(embeddingText);
        return cosineSimilarity(queryEmbedding, chunkEmbedding);
    }

    private List<Double> parseEmbedding(String embeddingText) {
        try {
            return objectMapper.readValue(
                    embeddingText,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, Double.class)
            );
        } catch (IOException exception) {
            LOG.warn("Skipping KB chunk with invalid embedding payload: {}", exception.getMessage());
            return List.of();
        }
    }

    private double cosineSimilarity(List<Double> a, List<Double> b) {
        if (a == null || b == null || a.isEmpty() || b.isEmpty() || a.size() != b.size()) {
            return 0.0;
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.size(); i++) {
            double av = a.get(i);
            double bv = b.get(i);
            dot += av * bv;
            normA += av * av;
            normB += bv * bv;
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private double normalizeCosineSimilarity(double cosineSimilarity) {
        return Math.max(0.0, (cosineSimilarity + 1.0) / 2.0);
    }

    private AiGuidance fallbackStructuredGuidance(
            List<String> noteTexts,
            ConversationState conversationState,
            CategorizedNotes categorizedNotes,
            GapAnalysis gapAnalysis,
            String fallbackAction,
            String fallbackApproach
    ) {
        String notesSummary = noteTexts.isEmpty() ? "" : noteTexts.get(0);
        String recommendedAction = """
                Direcția apelului: creează mai întâi încredere (claritate, empatie, validare), apoi discută soluția.
                Introducere recomandată: „Vreau să înțeleg exact contextul vostru înainte să propun orice direcție.”
                """.trim();
        if (!conversationState.nextExpectedStep().isBlank()) {
            recommendedAction = recommendedAction + "\nPas următor sugerat: " + conversationState.nextExpectedStep();
        }

        StringBuilder suggestedApproach = new StringBuilder("""
                Întrebări de încredere + discovery:
                - Care e contextul real în care a apărut problema și de ce e importantă acum?
                - Ce ați încercat deja și ce nu a funcționat cum sperați?
                - Cum ar arăta pentru voi un rezultat bun, realist, în primele 30-60 de zile?
                - Ce îngrijorări aveți legat de implementare sau schimbare?
                Decision tree recomandat:
                - Dacă spune „nu am încredere încă” -> validează preocuparea, oferă un exemplu relevant și cere acord pentru următoarea întrebare.
                - Dacă spune „e prea scump” -> clarifică impactul actual, apoi compară costul inacțiunii înainte de preț.
                - Dacă spune „nu am timp acum” -> propune un pas mic, fără risc, nu un angajament mare.
                - Dacă spune „trebuie să discut intern” -> setează cine decide, ce criterii are și când reveniți.
                Re-abordează obiecția: confirmă că ai înțeles riscul perceput și traduce soluția într-un plan simplu, controlabil.
                """.trim());
        if (!conversationState.conversationStage().isBlank()) {
            suggestedApproach.append("\nStadiu conversație: ").append(conversationState.conversationStage());
        }
        if (!conversationState.currentObjection().isBlank()) {
            suggestedApproach.append("\nObiecție curentă: ").append(conversationState.currentObjection());
        }
        if (!conversationState.confirmedFacts().isEmpty()) {
            suggestedApproach.append("\nFapte confirmate:");
            for (String fact : conversationState.confirmedFacts()) {
                suggestedApproach.append("\n- ").append(fact);
            }
        }
        appendCategorizedNotes(suggestedApproach, categorizedNotes);
        appendGapAnalysis(suggestedApproach, gapAnalysis);
        if (!conversationState.openQuestions().isEmpty()) {
            suggestedApproach.append("\nÎntrebări încă deschise:");
            for (String question : conversationState.openQuestions()) {
                suggestedApproach.append("\n- ").append(question);
            }
        }
        if (!notesSummary.isBlank()) {
            suggestedApproach.append("\nContext notițe: ").append(notesSummary);
        } else {
            suggestedApproach.append("\n").append(fallbackApproach);
        }

        if (recommendedAction.isBlank()) {
            recommendedAction = fallbackAction;
        }
        return new AiGuidance(recommendedAction, suggestedApproach.toString(), false, null);
    }

    private void appendCategorizedNotes(StringBuilder target, CategorizedNotes categorizedNotes) {
        appendNoteSection(target, "Discovery", categorizedNotes.notesFor(LeadNoteCategory.TYPE_DISCOVERY));
        appendNoteSection(target, "Confirmare", categorizedNotes.notesFor(LeadNoteCategory.TYPE_CONFIRMATION));
        appendNoteSection(target, "Obiecții", categorizedNotes.notesFor(LeadNoteCategory.TYPE_OBJECTION));
        appendNoteSection(target, "Pași următori", categorizedNotes.notesFor(LeadNoteCategory.TYPE_NEXT_STEP));
    }

    private void appendGapAnalysis(StringBuilder target, GapAnalysis gapAnalysis) {
        if (!gapAnalysis.doNotAskAgain().isEmpty()) {
            target.append("\nNu întreba din nou:");
            for (String item : gapAnalysis.doNotAskAgain()) {
                target.append("\n- ").append(item);
            }
        }
        if (!gapAnalysis.insistOn().isEmpty()) {
            target.append("\nInsistă pe:");
            for (String item : gapAnalysis.insistOn()) {
                target.append("\n- ").append(item);
            }
        }
        if (!gapAnalysis.missingInformation().isEmpty()) {
            target.append("\nLipsește încă:");
            for (String item : gapAnalysis.missingInformation()) {
                target.append("\n- ").append(item);
            }
        }
    }

    private void appendNoteSection(StringBuilder target, String label, List<String> notes) {
        if (notes.isEmpty()) {
            return;
        }
        target.append("\n").append(label).append(":");
        for (String note : notes) {
            target.append("\n- ").append(note);
        }
    }

    private String noteCategoryLabel(LeadNoteCategory category) {
        if (category == null) {
            return "";
        }
        return switch (category) {
            case TYPE_DISCOVERY -> "DISCOVERY";
            case TYPE_CONFIRMATION -> "CONFIRMATION";
            case TYPE_OBJECTION -> "OBJECTION";
            case TYPE_NEXT_STEP -> "NEXT_STEP";
            case TYPE_INTERNAL -> "INTERNAL";
        };
    }

    private record HybridChunkScore(String content, int lexicalScore, double vectorScore, double hybridScore) {}

    private record CategorizedNotes(
            Map<LeadNoteCategory, List<String>> notesByCategory,
            List<String> uncategorized
    ) {
        private List<String> notesFor(LeadNoteCategory category) {
            return notesByCategory.getOrDefault(category, List.of());
        }

        private String toPromptSection() {
            StringBuilder summary = new StringBuilder();
            append(summary, "Discovery", notesFor(LeadNoteCategory.TYPE_DISCOVERY));
            append(summary, "Confirmare", notesFor(LeadNoteCategory.TYPE_CONFIRMATION));
            append(summary, "Obiecții", notesFor(LeadNoteCategory.TYPE_OBJECTION));
            append(summary, "Pași următori", notesFor(LeadNoteCategory.TYPE_NEXT_STEP));
            append(summary, "Interne", notesFor(LeadNoteCategory.TYPE_INTERNAL));
            append(summary, "Fără categorie", uncategorized);
            return summary.toString().trim();
        }

        private static void append(StringBuilder target, String label, List<String> values) {
            if (values == null || values.isEmpty()) {
                return;
            }
            if (target.length() > 0) {
                target.append("\n");
            }
            target.append(label).append(":");
            for (String value : values) {
                target.append("\n- ").append(value);
            }
        }
    }

    private record GapAnalysis(
            List<String> knownAlready,
            List<String> doNotAskAgain,
            List<String> insistOn,
            List<String> missingInformation
    ) {
        private boolean isMeaningful() {
            return !knownAlready.isEmpty()
                    || !doNotAskAgain.isEmpty()
                    || !insistOn.isEmpty()
                    || !missingInformation.isEmpty();
        }
    }

    private record AntiRepetitionRules(
            List<String> completedTopics,
            List<String> rejectedTopics,
            List<String> preferredTopics
    ) {}

    private record RelationshipSignal(
            String overallSentiment,
            String riskLevel,
            String keyBlocker,
            String trend,
            double engagementMultiplier,
            int scoreAdjustment,
            String scoreImpactReason,
            boolean isFallback
    ) {}

    private record CachedInsightEntry(String key, LeadAiInsightsResponse response) {}

    private record ConversationState(
            List<String> confirmedFacts,
            String currentObjection,
            String conversationStage,
            String nextExpectedStep,
            List<String> openQuestions,
            double confidence
    ) {
        private boolean isMeaningful() {
            return !confirmedFacts.isEmpty()
                    || !currentObjection.isBlank()
                    || !conversationStage.isBlank()
                    || !nextExpectedStep.isBlank()
                    || !openQuestions.isEmpty()
                    || confidence > 0.0;
        }
    }

    private record ConfidenceAssessment(
            double score,
            String level,
            boolean shouldUseFallback,
            String fallbackReason
    ) {}

    private record GuidanceAdjustment(
            String recommendedAction,
            String suggestedApproach,
            boolean adjusted,
            String reason
    ) {}

    private record AiGuidance(
            String recommendedAction,
            String suggestedApproach,
            boolean aiGenerated,
            StrategicRecommendation strategy
    ) {}

    private record StrategicRecommendation(
            LeadAction nextBestAction,
            String reason,
            PsychologicalInsight psychologicalInsight,
            ConversationDirection conversationDirection,
            List<String> keyQuestionsToAsk,
            ObjectionStrategy objectionStrategy,
            List<String> whatToAvoid,
            List<String> missingInformation,
            StrategyScores scores
    ) {}

    private record LeadAction(String type, String priority, String timing, String channel) {}

    private record PsychologicalInsight(
            String dominantMotivation,
            String primaryBlocker,
            String decisionReadiness,
            String confidenceState,
            String riskOfStalling
    ) {}

    private record ConversationDirection(
            String primaryAngle,
            String positioning,
            String tone,
            List<String> focusPoints
    ) {}

    private record ObjectionStrategy(
            String mainObjectionToAddress,
            String reframe,
            List<String> supportingPoints
    ) {}

    private record StrategyScores(
            int clientScore,
            int nextCallCloseProbability,
            int leadReadinessScore,
            int buyingIntentScore,
            int psychologicalResistanceScore
    ) {}

    private record QualificationSignals(
            boolean clearProblem,
            boolean problemAware,
            boolean priceSensitive,
            boolean urgencyHigh,
            boolean valueOriented,
            boolean objectionVague,
            int scoreAdjustment
    ) {}

    private record AnswerSignals(
            boolean readyToStartNow,
            boolean budgetDeclared,
            boolean lowBudget,
            boolean singleDecisionMaker,
            boolean highPriority,
            boolean costOfInactionHigh,
            int scoreBoost
    ) {}
}
