package com.salesway.leads.service;

import com.salesway.billing.service.SubscriptionAccessService;
import com.salesway.leads.dto.LeadAiInsightsRegenerateResponse;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadAiInsightSnapshot;
import com.salesway.leads.enums.LeadAiInsightsStatus;
import com.salesway.leads.repository.LeadAiInsightSnapshotRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
public class LeadAiInsightsAsyncService {
    private static final Logger LOG = LoggerFactory.getLogger(LeadAiInsightsAsyncService.class);

    private final LeadRepository leadRepository;
    private final LeadAiInsightSnapshotRepository leadAiInsightSnapshotRepository;
    private final ManagerAccessService managerAccessService;
    private final LeadAiInsightsQueueService leadAiInsightsQueueService;
    private final LeadDetailsService leadDetailsService;
    private final SubscriptionAccessService subscriptionAccessService;
    private final long staleStatusTimeoutMs;

    public LeadAiInsightsAsyncService(
            LeadRepository leadRepository,
            LeadAiInsightSnapshotRepository leadAiInsightSnapshotRepository,
            ManagerAccessService managerAccessService,
            LeadAiInsightsQueueService leadAiInsightsQueueService,
            LeadDetailsService leadDetailsService,
            SubscriptionAccessService subscriptionAccessService,
            @Value("${app.leads.ai-insights-stale-timeout-ms:60000}") long staleStatusTimeoutMs
    ) {
        this.leadRepository = leadRepository;
        this.leadAiInsightSnapshotRepository = leadAiInsightSnapshotRepository;
        this.managerAccessService = managerAccessService;
        this.leadAiInsightsQueueService = leadAiInsightsQueueService;
        this.leadDetailsService = leadDetailsService;
        this.subscriptionAccessService = subscriptionAccessService;
        this.staleStatusTimeoutMs = staleStatusTimeoutMs;
    }

    @Transactional
    public LeadAiInsightsRegenerateResponse requestRegeneration(UUID leadId) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        Lead lead = leadRepository.findByIdAndCompanyId(leadId, membership.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
        subscriptionAccessService.assertAiFeaturesAvailable(lead.getCompany());
        if (!leadDetailsService.isAiInsightsRefreshRequired(lead) && !LeadAiInsightsStatus.FAILED.name().equalsIgnoreCase(lead.getAiInsightsStatus())) {
            LOG.info("AI insights regenerate skipped because snapshot is already fresh leadId={}", leadId);
            return new LeadAiInsightsRegenerateResponse("completed", leadId);
        }
        if (isInFlight(lead) && !isStatusStale(lead)) {
            LOG.info("AI insights regenerate ignored because job already in flight leadId={} status={}", leadId, lead.getAiInsightsStatus());
            return new LeadAiInsightsRegenerateResponse("pending", leadId);
        }
        lead.setAiInsightsStatus(LeadAiInsightsStatus.PENDING.name());
        lead.setAiInsightsError(null);
        leadRepository.save(lead);
        LeadAiInsightsQueueService.LeadAiInsightsJob job = leadAiInsightsQueueService.enqueueRegeneration(leadId);
        LOG.info("AI insights job enqueued leadId={} jobId={} enqueuedAt={} status=PENDING", leadId, job.jobId(), job.enqueuedAt());
        return new LeadAiInsightsRegenerateResponse("pending", leadId);
    }

    public void processQueuedRegeneration(UUID leadId) {
        processQueuedRegeneration(leadId, null);
    }

    public void processQueuedRegeneration(UUID leadId, UUID jobId) {
        try {
            LOG.info("AI insights job processing started leadId={} jobId={}", leadId, jobId);
            markProcessing(leadId);
            Lead lead = leadRepository.findById(leadId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead not found"));
            Instant previousSnapshotTimestamp = leadAiInsightSnapshotRepository
                    .findByLeadIdAndCompanyId(leadId, lead.getCompany().getId())
                    .map(this::snapshotTimestamp)
                    .orElse(null);
            leadDetailsService.regenerateAiInsightsInBackground(leadId);
            Instant currentSnapshotTimestamp = leadAiInsightSnapshotRepository
                    .findByLeadIdAndCompanyId(leadId, lead.getCompany().getId())
                    .map(this::snapshotTimestamp)
                    .orElse(null);
            if (!snapshotAdvanced(previousSnapshotTimestamp, currentSnapshotTimestamp)) {
                throw new IllegalStateException("AI insights regeneration completed without updating snapshot");
            }
            markCompleted(leadId);
            LOG.info("AI insights job processing completed leadId={} jobId={} finalStatus=COMPLETED previousSnapshotAt={} currentSnapshotAt={}",
                    leadId, jobId, previousSnapshotTimestamp, currentSnapshotTimestamp);
        } catch (Exception exception) {
            LOG.error("AI insights worker failed for leadId={} jobId={}", leadId, jobId, exception);
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

    private Instant snapshotTimestamp(LeadAiInsightSnapshot snapshot) {
        if (snapshot.getLastRegeneratedAt() != null) {
            return snapshot.getLastRegeneratedAt();
        }
        return snapshot.getGeneratedAt();
    }

    private boolean snapshotAdvanced(Instant previous, Instant current) {
        if (current == null) {
            return false;
        }
        if (previous == null) {
            return true;
        }
        return current.isAfter(previous);
    }

    private boolean isInFlight(Lead lead) {
        return LeadAiInsightsStatus.PENDING.name().equalsIgnoreCase(lead.getAiInsightsStatus())
                || LeadAiInsightsStatus.PROCESSING.name().equalsIgnoreCase(lead.getAiInsightsStatus());
    }

    private boolean isStatusStale(Lead lead) {
        if (lead.getUpdatedAt() == null) {
            return false;
        }
        return lead.getUpdatedAt().isBefore(Instant.now().minusMillis(staleStatusTimeoutMs));
    }
}
