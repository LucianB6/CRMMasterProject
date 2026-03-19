package com.salesway.leads.service;

import com.salesway.leads.dto.LeadAiInsightsRegenerateResponse;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.enums.LeadAiInsightsStatus;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class LeadAiInsightsAsyncService {
    private static final Logger LOG = LoggerFactory.getLogger(LeadAiInsightsAsyncService.class);

    private final LeadRepository leadRepository;
    private final ManagerAccessService managerAccessService;
    private final LeadAiInsightsQueueService leadAiInsightsQueueService;
    private final LeadDetailsService leadDetailsService;

    public LeadAiInsightsAsyncService(
            LeadRepository leadRepository,
            ManagerAccessService managerAccessService,
            LeadAiInsightsQueueService leadAiInsightsQueueService,
            LeadDetailsService leadDetailsService
    ) {
        this.leadRepository = leadRepository;
        this.managerAccessService = managerAccessService;
        this.leadAiInsightsQueueService = leadAiInsightsQueueService;
        this.leadDetailsService = leadDetailsService;
    }

    @Transactional
    public LeadAiInsightsRegenerateResponse requestRegeneration(UUID leadId) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        Lead lead = leadRepository.findByIdAndCompanyId(leadId, membership.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        lead.setAiInsightsStatus(LeadAiInsightsStatus.PENDING.name());
        lead.setAiInsightsError(null);
        leadRepository.save(lead);
        leadAiInsightsQueueService.enqueueRegeneration(leadId);
        return new LeadAiInsightsRegenerateResponse("pending", leadId);
    }

    public void processQueuedRegeneration(UUID leadId) {
        try {
            markProcessing(leadId);
            leadDetailsService.regenerateAiInsightsInBackground(leadId);
            markCompleted(leadId);
        } catch (Exception exception) {
            LOG.error("AI insights worker failed for leadId={}", leadId, exception);
            markFailed(leadId, exception);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markProcessing(UUID leadId) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        lead.setAiInsightsStatus(LeadAiInsightsStatus.PROCESSING.name());
        lead.setAiInsightsError(null);
        leadRepository.save(lead);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCompleted(UUID leadId) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        lead.setAiInsightsStatus(LeadAiInsightsStatus.COMPLETED.name());
        lead.setAiInsightsError(null);
        leadRepository.save(lead);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID leadId, Exception exception) {
        leadRepository.findById(leadId).ifPresent(lead -> {
            lead.setAiInsightsStatus(LeadAiInsightsStatus.FAILED.name());
            lead.setAiInsightsError(exception.getMessage() == null ? "AI insights regeneration failed" : exception.getMessage());
            leadRepository.save(lead);
        });
    }
}
