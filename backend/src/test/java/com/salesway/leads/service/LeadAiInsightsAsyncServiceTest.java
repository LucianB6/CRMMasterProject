package com.salesway.leads.service;

import com.salesway.auth.entity.User;
import com.salesway.companies.entity.Company;
import com.salesway.leads.dto.LeadAiInsightsRegenerateResponse;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.repository.LeadAiInsightSnapshotRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.manager.service.ManagerAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LeadAiInsightsAsyncServiceTest {

    private LeadRepository leadRepository;
    private LeadAiInsightSnapshotRepository leadAiInsightSnapshotRepository;
    private ManagerAccessService managerAccessService;
    private LeadAiInsightsQueueService leadAiInsightsQueueService;
    private LeadDetailsService leadDetailsService;
    private LeadAiInsightsAsyncService service;
    private Lead lead;
    private UUID leadId;
    private UUID companyId;

    @BeforeEach
    void setUp() {
        leadRepository = mock(LeadRepository.class);
        leadAiInsightSnapshotRepository = mock(LeadAiInsightSnapshotRepository.class);
        managerAccessService = mock(ManagerAccessService.class);
        leadAiInsightsQueueService = mock(LeadAiInsightsQueueService.class);
        leadDetailsService = mock(LeadDetailsService.class);
        service = new LeadAiInsightsAsyncService(
                leadRepository,
                leadAiInsightSnapshotRepository,
                managerAccessService,
                leadAiInsightsQueueService,
                leadDetailsService,
                60_000L
        );

        companyId = UUID.randomUUID();
        leadId = UUID.randomUUID();

        Company company = new Company();
        company.setId(companyId);
        User user = new User();
        user.setId(UUID.randomUUID());
        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(company);
        membership.setUser(user);
        when(managerAccessService.getManagerMembership()).thenReturn(membership);

        lead = new Lead();
        lead.setId(leadId);
        lead.setCompany(company);
        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));
    }

    @Test
    void requestRegeneration_skipsDuplicateEnqueueWhenJobAlreadyFreshInFlight() {
        lead.setAiInsightsStatus("PENDING");
        lead.setUpdatedAt(Instant.now());
        when(leadDetailsService.isAiInsightsRefreshRequired(lead)).thenReturn(true);

        LeadAiInsightsRegenerateResponse response = service.requestRegeneration(leadId);

        assertThat(response.status()).isEqualTo("pending");
        assertThat(response.leadId()).isEqualTo(leadId);
        verify(leadAiInsightsQueueService, never()).enqueueRegeneration(leadId);
    }

    @Test
    void requestRegeneration_reenqueuesWhenInFlightStatusIsStale() {
        lead.setAiInsightsStatus("PROCESSING");
        lead.setUpdatedAt(Instant.now().minusSeconds(120));
        when(leadDetailsService.isAiInsightsRefreshRequired(lead)).thenReturn(true);
        when(leadAiInsightsQueueService.enqueueRegeneration(leadId))
                .thenReturn(new LeadAiInsightsQueueService.LeadAiInsightsJob(UUID.randomUUID(), leadId, Instant.now()));

        LeadAiInsightsRegenerateResponse response = service.requestRegeneration(leadId);

        assertThat(response.status()).isEqualTo("pending");
        verify(leadRepository).save(lead);
        verify(leadAiInsightsQueueService).enqueueRegeneration(leadId);
    }

    @Test
    void requestRegeneration_returnsCompletedWhenSnapshotAlreadyFresh() {
        when(leadDetailsService.isAiInsightsRefreshRequired(lead)).thenReturn(false);

        LeadAiInsightsRegenerateResponse response = service.requestRegeneration(leadId);

        assertThat(response.status()).isEqualTo("completed");
        assertThat(response.leadId()).isEqualTo(leadId);
        verify(leadRepository, never()).save(lead);
        verify(leadAiInsightsQueueService, never()).enqueueRegeneration(leadId);
    }
}
