package com.salesway.leads.service;

import com.salesway.leads.dto.LeadScoringEnqueueResponse;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAnswer;
import com.salesway.leads.entity.LeadStandardFields;
import com.salesway.leads.enums.LeadAiStatus;
import com.salesway.leads.repository.LeadAnswerRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.repository.LeadStandardFieldsRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LeadAsyncScoringService {
    private static final Logger LOG = LoggerFactory.getLogger(LeadAsyncScoringService.class);

    private final LeadRepository leadRepository;
    private final LeadStandardFieldsRepository leadStandardFieldsRepository;
    private final LeadAnswerRepository leadAnswerRepository;
    private final ManagerAccessService managerAccessService;
    private final LeadScoringQueueService leadScoringQueueService;

    public LeadAsyncScoringService(
            LeadRepository leadRepository,
            LeadStandardFieldsRepository leadStandardFieldsRepository,
            LeadAnswerRepository leadAnswerRepository,
            ManagerAccessService managerAccessService,
            LeadScoringQueueService leadScoringQueueService
    ) {
        this.leadRepository = leadRepository;
        this.leadStandardFieldsRepository = leadStandardFieldsRepository;
        this.leadAnswerRepository = leadAnswerRepository;
        this.managerAccessService = managerAccessService;
        this.leadScoringQueueService = leadScoringQueueService;
    }

    @Transactional
    public LeadScoringEnqueueResponse requestScoring(UUID leadId) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        Lead lead = leadRepository.findByIdAndCompanyId(leadId, membership.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));

        lead.setAiStatus(LeadAiStatus.PENDING.name());
        lead.setAiError(null);
        leadRepository.save(lead);
        leadScoringQueueService.enqueueLeadScoring(leadId);
        return new LeadScoringEnqueueResponse("pending", leadId);
    }

    public void processQueuedLead(UUID leadId) {
        try {
            markProcessing(leadId);
            ScoringResult result = computeScore(leadId);
            markCompleted(leadId, result);
        } catch (Exception exception) {
            LOG.error("Lead scoring worker failed for leadId={}", leadId, exception);
            markFailed(leadId, exception);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markProcessing(UUID leadId) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        lead.setAiStatus(LeadAiStatus.PROCESSING.name());
        lead.setAiError(null);
        leadRepository.save(lead);
    }

    @Transactional(readOnly = true)
    public ScoringResult computeScore(UUID leadId) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        LeadStandardFields standardFields = leadStandardFieldsRepository.findByLeadId(leadId).orElse(null);
        List<LeadAnswer> answers = leadAnswerRepository.findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(leadId);
        boolean hasEmail = standardFields != null && standardFields.getEmail() != null && !standardFields.getEmail().isBlank();
        boolean hasPhone = standardFields != null && standardFields.getPhone() != null && !standardFields.getPhone().isBlank();
        String combinedAnswers = answers.stream()
                .map(this::answerText)
                .filter(value -> !value.isBlank())
                .collect(Collectors.joining(" "))
                .toLowerCase(Locale.ROOT);
        int requiredAnswers = (int) answers.stream()
                .filter(answer -> Boolean.TRUE.equals(answer.getRequiredSnapshot()))
                .count();
        int answeredRequired = (int) answers.stream()
                .filter(answer -> Boolean.TRUE.equals(answer.getRequiredSnapshot()))
                .filter(answer -> !answerText(answer).isBlank())
                .count();
        boolean readyNow = containsAny(combinedAnswers, "acum", "cat mai curand", "cât mai curând", "imediat");
        boolean highPriority = containsAny(combinedAnswers, "prioritar", "prioritate 9", "prioritate 10", "9", "10");
        boolean costOfInaction = containsAny(combinedAnswers, "stagn", "fara progres", "fără progres", "pierd", "stress", "stres", "frust");
        boolean valueOriented = containsAny(combinedAnswers, "valoare", "rezultate masurabile", "rezultate măsurabile", "directie clara", "direcție clară", "exemple concrete");
        boolean priceSensitive = containsAny(combinedAnswers, "pret", "preț", "buget")
                && !valueOriented;
        boolean clearProblem = containsAny(combinedAnswers, "problema", "blocaj", "obstacol", "lipsa", "dificultat", "strategie");
        boolean awareProblem = containsAny(combinedAnswers, "costul", "ma incetineste", "mă încetinește", "impact", "stagnare", "fara un job", "fără un job");
        boolean singleDecisionMaker = containsAny(combinedAnswers, "singurul decident", "singurul", "doar eu decid");
        boolean progressTimeline = containsAny(combinedAnswers, "1-2 luni", "1 2 luni", "6 luni", "urmatoarele luni", "următoarele luni");
        boolean examplesRequested = containsAny(combinedAnswers, "exemple concrete", "feedback concret", "rezultate", "oferte", "interviuri");

        List<CriterionScore> criteria = new ArrayList<>();
        criteria.add(new CriterionScore("Contactability", rateContactability(hasEmail, hasPhone)));
        criteria.add(new CriterionScore("Data Completeness", rateDataCompleteness(answers.size(), requiredAnswers, answeredRequired)));
        criteria.add(new CriterionScore("Problem Clarity", clearProblem ? 9 : 3));
        criteria.add(new CriterionScore("Problem Awareness", awareProblem || costOfInaction ? 9 : 3));
        criteria.add(new CriterionScore("Urgency To Change", readyNow || highPriority ? 9 : 4));
        criteria.add(new CriterionScore("Cost Of Inaction", costOfInaction ? 9 : 3));
        criteria.add(new CriterionScore("Value Orientation", valueOriented ? 9 : priceSensitive ? 2 : 5));
        criteria.add(new CriterionScore("Decision Authority", singleDecisionMaker ? 10 : 5));
        criteria.add(new CriterionScore("Timeline Clarity", progressTimeline ? 8 : 4));
        criteria.add(new CriterionScore("Proof Need / Validation", examplesRequested ? 8 : 5));

        int score = criteria.stream()
                .mapToInt(CriterionScore::value)
                .sum();

        String summary = buildSummary(lead, criteria, answers.size(), hasEmail, hasPhone, priceSensitive);

        return new ScoringResult(score, summary);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCompleted(UUID leadId, ScoringResult result) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        lead.setAiStatus(LeadAiStatus.COMPLETED.name());
        lead.setAiScore(result.score());
        lead.setAiSummary(result.summary());
        lead.setAiError(null);
        leadRepository.save(lead);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID leadId, Exception exception) {
        leadRepository.findById(leadId).ifPresent(lead -> {
            lead.setAiStatus(LeadAiStatus.FAILED.name());
            lead.setAiError(exception.getMessage() == null ? "Lead scoring failed" : exception.getMessage());
            leadRepository.save(lead);
        });
    }

    public record ScoringResult(int score, String summary) {
    }

    private int rateContactability(boolean hasEmail, boolean hasPhone) {
        if (hasEmail && hasPhone) {
            return 10;
        }
        if (hasEmail || hasPhone) {
            return 6;
        }
        return 0;
    }

    private int rateDataCompleteness(int totalAnswers, int requiredAnswers, int answeredRequired) {
        if (totalAnswers == 0) {
            return 0;
        }
        if (requiredAnswers == 0) {
            return Math.min(10, 4 + totalAnswers);
        }
        double completion = (double) answeredRequired / requiredAnswers;
        return Math.max(0, Math.min(10, (int) Math.round(completion * 10)));
    }

    private String answerText(LeadAnswer answer) {
        if (answer.getAnswerValue() == null || answer.getAnswerValue().isNull()) {
            return "";
        }
        if (answer.getAnswerValue().isTextual()) {
            return answer.getAnswerValue().asText("");
        }
        if (answer.getAnswerValue().isArray()) {
            List<String> values = new ArrayList<>();
            answer.getAnswerValue().forEach(item -> values.add(item.asText("")));
            return String.join(" ", values);
        }
        return answer.getAnswerValue().asText("");
    }

    private boolean containsAny(String source, String... needles) {
        for (String needle : needles) {
            if (source.contains(needle.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private String buildSummary(
            Lead lead,
            List<CriterionScore> criteria,
            int answersCount,
            boolean hasEmail,
            boolean hasPhone,
            boolean priceSensitive
    ) {
        String breakdown = criteria.stream()
                .map(criterion -> criterion.label() + "=" + criterion.value() + "/10")
                .collect(Collectors.joining(", "));
        return "Async scoring completed. Total score is the sum of 10 criteria scored 0-10. status="
                + lead.getStatus()
                + ", answers="
                + answersCount
                + ", hasEmail="
                + hasEmail
                + ", hasPhone="
                + hasPhone
                + ", priceSensitive="
                + priceSensitive
                + ", breakdown=["
                + breakdown
                + "].";
    }

    private record CriterionScore(String label, int value) {
    }
}
