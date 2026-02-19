package com.salesway.leads.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.leads.dto.LeadAnswerResponse;
import com.salesway.leads.dto.LeadDetailResponse;
import com.salesway.leads.dto.LeadListItemResponse;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAnswer;
import com.salesway.leads.entity.LeadStandardFields;
import com.salesway.leads.enums.LeadStatus;
import com.salesway.leads.repository.LeadAnswerRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.repository.LeadStandardFieldsRepository;
import com.salesway.manager.service.ManagerAccessService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class LeadManagementService {
    private static final int MAX_PAGE_SIZE = 100;

    private final LeadRepository leadRepository;
    private final LeadStandardFieldsRepository standardFieldsRepository;
    private final LeadAnswerRepository leadAnswerRepository;
    private final ManagerAccessService managerAccessService;
    private final ObjectMapper objectMapper;

    public LeadManagementService(
            LeadRepository leadRepository,
            LeadStandardFieldsRepository standardFieldsRepository,
            LeadAnswerRepository leadAnswerRepository,
            ManagerAccessService managerAccessService,
            ObjectMapper objectMapper
    ) {
        this.leadRepository = leadRepository;
        this.standardFieldsRepository = standardFieldsRepository;
        this.leadAnswerRepository = leadAnswerRepository;
        this.managerAccessService = managerAccessService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<LeadListItemResponse> listLeads(String status, int page, int size) {
        validatePaging(page, size);
        String normalizedStatus = LeadStatus.normalize(status);
        UUID companyId = managerAccessService.getManagerMembership().getCompany().getId();
        Pageable pageable = PageRequest.of(page, size);
        Page<Lead> leads = (normalizedStatus == null)
                ? leadRepository.findByCompanyIdOrderBySubmittedAtDesc(companyId, pageable)
                : leadRepository.findByCompanyIdAndStatusOrderBySubmittedAtDesc(companyId, normalizedStatus, pageable);

        return leads.map(lead -> {
            LeadStandardFields standard = standardFieldsRepository.findByLeadId(lead.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lead standard fields missing"));
            return new LeadListItemResponse(
                    lead.getId(), lead.getStatus(), lead.getSubmittedAt(),
                    standard.getFirstName(), standard.getLastName(), standard.getEmail(), standard.getPhone()
            );
        });
    }

    @Transactional(readOnly = true)
    public LeadDetailResponse getLead(UUID leadId) {
        UUID companyId = managerAccessService.getManagerMembership().getCompany().getId();
        Lead lead = leadRepository.findByIdAndCompanyId(leadId, companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));

        LeadStandardFields standard = standardFieldsRepository.findByLeadId(lead.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Lead standard fields missing"));

        List<LeadAnswerResponse> answers = leadAnswerRepository.findByLeadIdOrderByCreatedAtAsc(lead.getId())
                .stream().map(this::toAnswerResponse).toList();

        return new LeadDetailResponse(
                lead.getId(), lead.getStatus(), lead.getSubmittedAt(),
                standard.getFirstName(), standard.getLastName(), standard.getEmail(), standard.getPhone(),
                answers
        );
    }

    @Transactional
    public void updateStatus(UUID leadId, String status) {
        String normalizedStatus = LeadStatus.normalize(status);
        UUID companyId = managerAccessService.getManagerMembership().getCompany().getId();
        Lead lead = leadRepository.findByIdAndCompanyId(leadId, companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        lead.setStatus(normalizedStatus);
        leadRepository.save(lead);
    }

    private void validatePaging(int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("Invalid page: must be >= 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Invalid size: must be between 1 and " + MAX_PAGE_SIZE);
        }
    }

    private LeadAnswerResponse toAnswerResponse(LeadAnswer answer) {
        return new LeadAnswerResponse(
                answer.getQuestion() != null ? answer.getQuestion().getId() : null,
                answer.getQuestionLabelSnapshot(),
                answer.getQuestionTypeSnapshot(),
                answer.getRequiredSnapshot(),
                toJsonString(answer.getOptionsSnapshot()),
                toJsonString(answer.getAnswerValue())
        );
    }

    private String toJsonString(JsonNode node) {
        if (node == null) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize lead answer", exception);
        }
    }
}
