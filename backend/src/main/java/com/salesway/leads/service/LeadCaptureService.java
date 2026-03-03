package com.salesway.leads.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.leads.dto.LeadFormResponse;
import com.salesway.leads.dto.LeadQuestionResponse;
import com.salesway.leads.dto.PublicLeadSubmitRequest;
import com.salesway.leads.dto.PublicLeadSubmitResponse;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAnswer;
import com.salesway.leads.entity.LeadForm;
import com.salesway.leads.entity.LeadFormQuestion;
import com.salesway.leads.entity.LeadStandardFields;
import com.salesway.leads.enums.LeadEventType;
import com.salesway.leads.enums.LeadSource;
import com.salesway.leads.repository.LeadAnswerRepository;
import com.salesway.leads.repository.LeadFormQuestionRepository;
import com.salesway.leads.repository.LeadFormRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.repository.LeadStandardFieldsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class LeadCaptureService {
    private static final Set<String> TEXT_TYPES = Set.of("short_text", "long_text");

    private final LeadFormRepository leadFormRepository;
    private final LeadFormQuestionRepository questionRepository;
    private final LeadRepository leadRepository;
    private final LeadStandardFieldsRepository standardFieldsRepository;
    private final LeadAnswerRepository answerRepository;
    private final LeadEventService leadEventService;
    private final ObjectMapper objectMapper;
    private final int dedupeWindowDays;

    public LeadCaptureService(
            LeadFormRepository leadFormRepository,
            LeadFormQuestionRepository questionRepository,
            LeadRepository leadRepository,
            LeadStandardFieldsRepository standardFieldsRepository,
            LeadAnswerRepository answerRepository,
            LeadEventService leadEventService,
            ObjectMapper objectMapper,
            @org.springframework.beans.factory.annotation.Value("${app.leads.dedupe-window-days:7}") int dedupeWindowDays
    ) {
        this.leadFormRepository = leadFormRepository;
        this.questionRepository = questionRepository;
        this.leadRepository = leadRepository;
        this.standardFieldsRepository = standardFieldsRepository;
        this.answerRepository = answerRepository;
        this.leadEventService = leadEventService;
        this.objectMapper = objectMapper;
        this.dedupeWindowDays = dedupeWindowDays;
    }

    @Transactional(readOnly = true)
    public LeadFormResponse getPublicForm(String publicSlug) {
        LeadForm form = leadFormRepository.findByPublicSlugAndIsActiveTrue(publicSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead form not found"));

        List<LeadQuestionResponse> questions = questionRepository.findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(form.getId())
                .stream().map(q -> new LeadQuestionResponse(
                        q.getId(), q.getQuestionType(), q.getLabel(), q.getPlaceholder(),
                        q.getHelpText(), q.getRequired(), toJson(q.getOptionsJson()), q.getDisplayOrder(), q.getIsActive()
                )).toList();

        return new LeadFormResponse(form.getId(), form.getTitle(), form.getPublicSlug(), form.getIsActive(), questions);
    }

    @Transactional
    public PublicLeadSubmitResponse submitLead(String publicSlug, PublicLeadSubmitRequest request) {
        LeadForm form = leadFormRepository.findByPublicSlugAndIsActiveTrue(publicSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead form not found"));

        List<LeadFormQuestion> activeQuestions = questionRepository.findByLeadFormIdAndIsActiveTrue(form.getId());
        Map<UUID, LeadFormQuestion> questionsById = new HashMap<>();
        for (LeadFormQuestion question : activeQuestions) {
            questionsById.put(question.getId(), question);
        }

        Map<UUID, JsonNode> incomingAnswersByQuestionId = new HashMap<>();
        for (PublicLeadSubmitRequest.Answer answer : request.getAnswers()) {
            if (incomingAnswersByQuestionId.put(answer.getQuestionId(), answer.getValue()) != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "answers questionId duplicated: " + answer.getQuestionId());
            }
        }

        List<UUID> missingRequired = activeQuestions.stream()
                .filter(q -> Boolean.TRUE.equals(q.getRequired()))
                .map(LeadFormQuestion::getId)
                .filter(id -> !incomingAnswersByQuestionId.containsKey(id))
                .toList();

        if (!missingRequired.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing required questionIds: " + missingRequired);
        }

        for (PublicLeadSubmitRequest.Answer answerItem : request.getAnswers()) {
            LeadFormQuestion question = questionsById.get(answerItem.getQuestionId());
            if (question == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "questionId invalid or inactive for this form: " + answerItem.getQuestionId());
            }
            validateAnswerValue(question, answerItem.getValue());
        }

        String normalizedEmail = request.getStandard().getEmail().trim().toLowerCase();
        String normalizedPhone = request.getStandard().getPhone().trim();
        Lead duplicateCandidate = findDuplicateCandidate(form.getCompany().getId(), normalizedEmail, normalizedPhone);

        Lead lead = new Lead();
        lead.setCompany(form.getCompany());
        lead.setLeadForm(form);
        applyTracking(lead, request.getTracking());
        if (lead.getSource() == null) {
            lead.setSource(LeadSource.FORM.name());
        }
        lead.setStatus("new");
        lead.setSubmittedAt(Instant.now());
        lead.setLastActivityAt(lead.getSubmittedAt());
        if (duplicateCandidate != null) {
            lead.setDuplicateOfLeadId(duplicateCandidate.getId());
            lead.setDuplicateGroupId(
                    duplicateCandidate.getDuplicateGroupId() != null
                            ? duplicateCandidate.getDuplicateGroupId()
                            : duplicateCandidate.getId()
            );
        }
        Lead savedLead = leadRepository.save(lead);

        LeadStandardFields standardFields = new LeadStandardFields();
        standardFields.setLead(savedLead);
        standardFields.setFirstName(request.getStandard().getFirstName());
        standardFields.setLastName(request.getStandard().getLastName());
        standardFields.setEmail(normalizedEmail);
        standardFields.setPhone(normalizedPhone);
        standardFieldsRepository.save(standardFields);

        for (PublicLeadSubmitRequest.Answer answerItem : request.getAnswers()) {
            LeadFormQuestion question = questionsById.get(answerItem.getQuestionId());
            LeadAnswer answer = new LeadAnswer();
            answer.setLead(savedLead);
            answer.setQuestion(question);
            answer.setAnswerValue(answerItem.getValue());
            answer.setQuestionLabelSnapshot(question.getLabel());
            answer.setQuestionTypeSnapshot(question.getQuestionType());
            answer.setRequiredSnapshot(question.getRequired());
            answer.setOptionsSnapshot(question.getOptionsJson());
            answerRepository.save(answer);
        }

        leadEventService.appendSystemEvent(
                savedLead,
                LeadEventType.LEAD_CREATED,
                "Lead captured from public form",
                Map.of(
                        "source", savedLead.getSource(),
                        "isDuplicate", savedLead.getDuplicateGroupId() != null
                )
        );
        leadRepository.save(savedLead);

        return new PublicLeadSubmitResponse(savedLead.getId(), savedLead.getSubmittedAt(), savedLead.getStatus());
    }

    private Lead findDuplicateCandidate(UUID companyId, String email, String phone) {
        Instant since = Instant.now().minusSeconds((long) dedupeWindowDays * 24L * 3600L);
        return standardFieldsRepository.findRecentPotentialDuplicates(companyId, since, email, phone)
                .stream()
                .map(LeadStandardFields::getLead)
                .findFirst()
                .orElse(null);
    }

    private void applyTracking(Lead lead, PublicLeadSubmitRequest.Tracking tracking) {
        if (tracking == null) {
            return;
        }
        lead.setSource(LeadSource.normalize(tracking.getSource()));
        lead.setCampaign(trimToNull(tracking.getCampaign()));
        lead.setAdSet(trimToNull(tracking.getAdSet()));
        lead.setAdId(trimToNull(tracking.getAdId()));
        lead.setUtmSource(trimToNull(tracking.getUtmSource()));
        lead.setUtmCampaign(trimToNull(tracking.getUtmCampaign()));
        lead.setUtmMedium(trimToNull(tracking.getUtmMedium()));
        lead.setUtmContent(trimToNull(tracking.getUtmContent()));
        lead.setLandingPage(trimToNull(tracking.getLandingPage()));
        lead.setReferrer(trimToNull(tracking.getReferrer()));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
            String selected = value.asText();
            if (!options.contains(selected)) {
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

    private List<String> extractSelectOptions(LeadFormQuestion question) {
        JsonNode optionsNode = question.getOptionsJson();
        if (optionsNode == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "optionsJson invalid JSON for questionId=" + question.getId() + ": expected non-empty JSON array of strings");
        }

        JsonNode parsedNode = optionsNode;
        if (optionsNode.isTextual()) {
            try {
                parsedNode = objectMapper.readTree(optionsNode.asText());
            } catch (JsonProcessingException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "optionsJson invalid JSON for questionId=" + question.getId(), exception);
            }
        }

        if (!parsedNode.isArray() || parsedNode.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "optionsJson invalid JSON for questionId=" + question.getId() + ": expected non-empty JSON array of strings");
        }

        List<String> options = new java.util.ArrayList<>();
        for (JsonNode optionNode : parsedNode) {
            if (!optionNode.isTextual() || optionNode.asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "optionsJson invalid JSON for questionId=" + question.getId() + ": expected non-empty JSON array of strings");
            }
            options.add(optionNode.asText());
        }
        return options;
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid answer payload", exception);
        }
    }
}
