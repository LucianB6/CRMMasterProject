package com.salesway.leads.service;

import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.leads.dto.LeadFormResponse;
import com.salesway.leads.dto.LeadFormUpdateRequest;
import com.salesway.leads.dto.LeadQuestionReorderRequest;
import com.salesway.leads.dto.LeadQuestionRequest;
import com.salesway.leads.dto.LeadQuestionResponse;
import com.salesway.leads.entity.LeadForm;
import com.salesway.leads.entity.LeadFormQuestion;
import com.salesway.leads.repository.LeadFormQuestionRepository;
import com.salesway.leads.repository.LeadFormRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LeadFormService {
    private final LeadFormRepository leadFormRepository;
    private final LeadFormQuestionRepository questionRepository;
    private final ManagerAccessService managerAccessService;
    private final CompanyRepository companyRepository;

    public LeadFormService(
            LeadFormRepository leadFormRepository,
            LeadFormQuestionRepository questionRepository,
            ManagerAccessService managerAccessService,
            CompanyRepository companyRepository
    ) {
        this.leadFormRepository = leadFormRepository;
        this.questionRepository = questionRepository;
        this.managerAccessService = managerAccessService;
        this.companyRepository = companyRepository;
    }

    @Transactional(readOnly = true)
    public LeadFormResponse getManagerForm() {
        LeadForm form = getOrCreateFormForManager();
        List<LeadQuestionResponse> questions = questionRepository
                .findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(form.getId())
                .stream()
                .map(this::toQuestionResponse)
                .toList();
        return new LeadFormResponse(form.getId(), form.getTitle(), form.getPublicSlug(), form.getIsActive(), questions);
    }

    @Transactional
    public LeadFormResponse upsertForm(LeadFormUpdateRequest request) {
        LeadForm form = getOrCreateFormForManager();
        form.setTitle(request.getTitle());
        form.setPublicSlug(request.getPublicSlug());
        form.setIsActive(Boolean.TRUE.equals(request.getIsActive()));
        LeadForm saved = leadFormRepository.save(form);
        return new LeadFormResponse(saved.getId(), saved.getTitle(), saved.getPublicSlug(), saved.getIsActive(),
                questionRepository.findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(saved.getId())
                        .stream().map(this::toQuestionResponse).toList());
    }

    @Transactional
    public LeadQuestionResponse addQuestion(LeadQuestionRequest request) {
        LeadForm form = getOrCreateFormForManager();
        LeadFormQuestion question = new LeadFormQuestion();
        question.setLeadForm(form);
        applyQuestionRequest(question, request);
        question.setIsActive(true);
        return toQuestionResponse(questionRepository.save(question));
    }

    @Transactional
    public LeadQuestionResponse updateQuestion(UUID questionId, LeadQuestionRequest request) {
        LeadForm form = getOrCreateFormForManager();
        LeadFormQuestion question = questionRepository.findByIdAndLeadFormId(questionId, form.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        applyQuestionRequest(question, request);
        return toQuestionResponse(questionRepository.save(question));
    }

    @Transactional
    public void reorderQuestions(LeadQuestionReorderRequest request) {
        LeadForm form = getOrCreateFormForManager();
        Map<UUID, Integer> orderMap = request.getItems().stream()
                .collect(Collectors.toMap(LeadQuestionReorderRequest.Item::getQuestionId, LeadQuestionReorderRequest.Item::getDisplayOrder));
        List<LeadFormQuestion> questions = questionRepository.findByLeadFormIdAndIdIn(form.getId(), orderMap.keySet());
        if (questions.size() != orderMap.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more questions do not belong to this form");
        }
        for (LeadFormQuestion question : questions) {
            question.setDisplayOrder(orderMap.get(question.getId()));
        }
        questionRepository.saveAll(questions);
    }

    @Transactional
    public void deactivateQuestion(UUID questionId) {
        LeadForm form = getOrCreateFormForManager();
        LeadFormQuestion question = questionRepository.findByIdAndLeadFormId(questionId, form.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found"));
        question.setIsActive(false);
        questionRepository.save(question);
    }

    @Transactional(readOnly = true)
    public LeadForm getOrCreateFormForManager() {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        UUID companyId = membership.getCompany().getId();
        return leadFormRepository.findByCompanyId(companyId).orElseGet(() -> {
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Company not found"));
            LeadForm leadForm = new LeadForm();
            leadForm.setCompany(company);
            leadForm.setTitle("Lead Form");
            leadForm.setPublicSlug("lead-" + companyId.toString().substring(0, 8));
            leadForm.setIsActive(true);
            return leadFormRepository.save(leadForm);
        });
    }

    private void applyQuestionRequest(LeadFormQuestion question, LeadQuestionRequest request) {
        question.setQuestionType(request.getQuestionType());
        question.setLabel(request.getLabel());
        question.setPlaceholder(request.getPlaceholder());
        question.setHelpText(request.getHelpText());
        question.setRequired(request.getRequired());
        question.setOptionsJson(request.getOptionsJson());
        question.setDisplayOrder(request.getDisplayOrder());
    }

    private LeadQuestionResponse toQuestionResponse(LeadFormQuestion question) {
        return new LeadQuestionResponse(
                question.getId(),
                question.getQuestionType(),
                question.getLabel(),
                question.getPlaceholder(),
                question.getHelpText(),
                question.getRequired(),
                question.getOptionsJson(),
                question.getDisplayOrder(),
                question.getIsActive()
        );
    }
}
