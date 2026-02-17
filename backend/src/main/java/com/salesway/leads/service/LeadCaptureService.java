package com.salesway.leads.service;

import com.fasterxml.jackson.core.JsonProcessingException;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class LeadCaptureService {
    private final LeadFormRepository leadFormRepository;
    private final LeadFormQuestionRepository questionRepository;
    private final LeadRepository leadRepository;
    private final LeadStandardFieldsRepository standardFieldsRepository;
    private final LeadAnswerRepository answerRepository;
    private final ObjectMapper objectMapper;

    public LeadCaptureService(
            LeadFormRepository leadFormRepository,
            LeadFormQuestionRepository questionRepository,
            LeadRepository leadRepository,
            LeadStandardFieldsRepository standardFieldsRepository,
            LeadAnswerRepository answerRepository,
            ObjectMapper objectMapper
    ) {
        this.leadFormRepository = leadFormRepository;
        this.questionRepository = questionRepository;
        this.leadRepository = leadRepository;
        this.standardFieldsRepository = standardFieldsRepository;
        this.answerRepository = answerRepository;
        this.objectMapper = objectMapper;
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

        Set<UUID> incomingQuestionIds = request.getAnswers().stream().map(PublicLeadSubmitRequest.Answer::getQuestionId).collect(java.util.stream.Collectors.toSet());

        List<String> missingRequired = activeQuestions.stream()
                .filter(q -> Boolean.TRUE.equals(q.getRequired()))
                .filter(q -> !incomingQuestionIds.contains(q.getId()))
                .map(LeadFormQuestion::getLabel)
                .toList();

        if (!missingRequired.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required answers: " + String.join(", ", missingRequired));
        }

        Lead lead = new Lead();
        lead.setCompany(form.getCompany());
        lead.setLeadForm(form);
        lead.setSource("form");
        lead.setStatus("new");
        lead.setSubmittedAt(Instant.now());
        Lead savedLead = leadRepository.save(lead);

        LeadStandardFields standardFields = new LeadStandardFields();
        standardFields.setLead(savedLead);
        standardFields.setFirstName(request.getStandard().getFirstName());
        standardFields.setLastName(request.getStandard().getLastName());
        standardFields.setEmail(request.getStandard().getEmail());
        standardFields.setPhone(request.getStandard().getPhone());
        standardFieldsRepository.save(standardFields);

        for (PublicLeadSubmitRequest.Answer answerItem : request.getAnswers()) {
            LeadFormQuestion question = questionsById.get(answerItem.getQuestionId());
            if (question == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question does not belong to active form: " + answerItem.getQuestionId());
            }
            LeadAnswer answer = new LeadAnswer();
            answer.setLead(savedLead);
            answer.setQuestion(question);
            answer.setAnswerValue(toJson(answerItem.getValue()));
            answer.setQuestionLabelSnapshot(question.getLabel());
            answer.setQuestionTypeSnapshot(question.getQuestionType());
            answer.setRequiredSnapshot(question.getRequired());
            answer.setOptionsSnapshot(toJson(question.getOptionsJson()));
            answerRepository.save(answer);
        }

        return new PublicLeadSubmitResponse(savedLead.getId(), savedLead.getSubmittedAt(), savedLead.getStatus());
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
