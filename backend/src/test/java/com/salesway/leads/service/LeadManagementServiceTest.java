package com.salesway.leads.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.leads.dto.LeadNoteRequest;
import com.salesway.companies.entity.Company;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.PipelineStage;
import com.salesway.leads.enums.LeadEventType;
import com.salesway.leads.enums.LeadNoteCategory;
import com.salesway.leads.repository.LeadAnswerRepository;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.repository.LeadStandardFieldsRepository;
import com.salesway.leads.repository.PipelineStageRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.tasks.service.TaskBoardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LeadManagementServiceTest {

    private LeadRepository leadRepository;
    private LeadStandardFieldsRepository standardFieldsRepository;
    private LeadAnswerRepository leadAnswerRepository;
    private CompanyMembershipRepository companyMembershipRepository;
    private TaskBoardService taskBoardService;
    private LeadEventService leadEventService;
    private PipelineStageRepository pipelineStageRepository;
    private LeadManagementService leadManagementService;

    private CompanyMembership managerMembership;
    private UUID companyId;
    private UUID managerUserId;

    @BeforeEach
    void setUp() {
        leadRepository = mock(LeadRepository.class);
        standardFieldsRepository = mock(LeadStandardFieldsRepository.class);
        leadAnswerRepository = mock(LeadAnswerRepository.class);
        companyMembershipRepository = mock(CompanyMembershipRepository.class);
        taskBoardService = mock(TaskBoardService.class);
        leadEventService = mock(LeadEventService.class);
        pipelineStageRepository = mock(PipelineStageRepository.class);

        companyId = UUID.randomUUID();
        managerUserId = UUID.randomUUID();

        Company company = new Company();
        company.setId(companyId);

        com.salesway.auth.entity.User managerUser = new com.salesway.auth.entity.User();
        managerUser.setId(managerUserId);

        managerMembership = new CompanyMembership();
        managerMembership.setCompany(company);
        managerMembership.setUser(managerUser);
        managerMembership.setRole(MembershipRole.MANAGER);
        managerMembership.setStatus(MembershipStatus.ACTIVE);

        ManagerAccessService managerAccessService = mock(ManagerAccessService.class);
        when(managerAccessService.getManagerMembership()).thenReturn(managerMembership);

        leadManagementService = new LeadManagementService(
                leadRepository,
                standardFieldsRepository,
                leadAnswerRepository,
                managerAccessService,
                companyMembershipRepository,
                taskBoardService,
                leadEventService,
                pipelineStageRepository,
                new ObjectMapper()
        );
    }

    @Test
    void updateStatus_createsStatusChangedEvent() {
        UUID leadId = UUID.randomUUID();
        Lead lead = new Lead();
        lead.setId(leadId);
        lead.setStatus("new");
        lead.setSubmittedAt(Instant.now());

        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));

        leadManagementService.updateStatus(leadId, "qualified");

        ArgumentCaptor<Lead> leadCaptor = ArgumentCaptor.forClass(Lead.class);
        verify(leadRepository).save(leadCaptor.capture());
        assertThat(leadCaptor.getValue().getStatus()).isEqualTo("qualified");
        verify(leadEventService).appendEvent(eq(lead), any(), eq("Lead status changed"), any());
    }

    @Test
    void updateAssignee_otherCompanyUser_rejected() {
        UUID leadId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();
        Lead lead = new Lead();
        lead.setId(leadId);
        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));
        when(companyMembershipRepository.findByCompanyIdAndUserId(companyId, assigneeId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leadManagementService.updateAssignee(leadId, assigneeId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("current company");
    }

    @Test
    void listLeads_invalidSort_throwsBadRequestCandidate() {
        assertThatThrownBy(() -> leadManagementService.listLeads(
                null,
                0,
                20,
                null,
                null,
                null,
                null,
                null,
                null,
                "unknown,desc"
        )).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void updateAssignee_nonManager_forbidden() {
        managerMembership.setRole(MembershipRole.AGENT);
        UUID leadId = UUID.randomUUID();
        UUID assigneeId = UUID.randomUUID();

        assertThatThrownBy(() -> leadManagementService.updateAssignee(leadId, assigneeId))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void updateStage_crossCompanyStageRejected() {
        UUID leadId = UUID.randomUUID();
        UUID stageId = UUID.randomUUID();
        Lead lead = new Lead();
        lead.setId(leadId);
        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));
        when(pipelineStageRepository.findByIdAndCompanyId(stageId, companyId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> leadManagementService.updateStage(leadId, stageId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("stageId");
    }

    @Test
    void updateStage_validStageAssigned() {
        UUID leadId = UUID.randomUUID();
        UUID stageId = UUID.randomUUID();
        Lead lead = new Lead();
        lead.setId(leadId);
        PipelineStage stage = new PipelineStage();
        stage.setId(stageId);

        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));
        when(pipelineStageRepository.findByIdAndCompanyId(stageId, companyId)).thenReturn(Optional.of(stage));

        leadManagementService.updateStage(leadId, stageId);

        verify(leadRepository).save(lead);
        assertThat(lead.getStage()).isEqualTo(stage);
    }

    @Test
    void addNote_persistsCategoryInEventPayload() {
        UUID leadId = UUID.randomUUID();
        Lead lead = new Lead();
        lead.setId(leadId);
        when(leadRepository.findByIdAndCompanyId(leadId, companyId)).thenReturn(Optional.of(lead));

        LeadNoteRequest request = new LeadNoteRequest();
        request.setText("Buget confirmat 5000 EUR");
        request.setCategory(LeadNoteCategory.TYPE_CONFIRMATION);

        leadManagementService.addNote(leadId, request);

        ArgumentCaptor<java.util.Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(java.util.Map.class);
        verify(leadEventService).appendEvent(eq(lead), eq(LeadEventType.NOTE_ADDED), eq("Lead note added"), payloadCaptor.capture());
        assertThat(payloadCaptor.getValue()).containsEntry("text", "Buget confirmat 5000 EUR");
        assertThat(payloadCaptor.getValue()).containsEntry("category", "TYPE_CONFIRMATION");
    }
}
