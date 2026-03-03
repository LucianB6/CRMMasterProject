package com.salesway.leads.service;

import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.leads.dto.PipelineStageReorderRequest;
import com.salesway.leads.dto.PipelineStageRequest;
import com.salesway.leads.entity.PipelineStage;
import com.salesway.leads.repository.PipelineStageRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PipelineStageServiceTest {
    private PipelineStageRepository pipelineStageRepository;
    private PipelineStageService pipelineStageService;
    private UUID companyId;

    @BeforeEach
    void setUp() {
        pipelineStageRepository = mock(PipelineStageRepository.class);
        companyId = UUID.randomUUID();

        Company company = new Company();
        company.setId(companyId);

        CompanyMembership membership = new CompanyMembership();
        membership.setCompany(company);
        membership.setRole(MembershipRole.MANAGER);
        membership.setStatus(MembershipStatus.ACTIVE);

        ManagerAccessService managerAccessService = mock(ManagerAccessService.class);
        when(managerAccessService.getManagerMembership()).thenReturn(membership);

        pipelineStageService = new PipelineStageService(pipelineStageRepository, managerAccessService);
        when(pipelineStageRepository.save(any(PipelineStage.class))).thenAnswer(invocation -> {
            PipelineStage stage = invocation.getArgument(0);
            if (stage.getId() == null) {
                stage.setId(UUID.randomUUID());
            }
            return stage;
        });
    }

    @Test
    void createStage_success() {
        when(pipelineStageRepository.findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(companyId))
                .thenReturn(List.of());
        PipelineStageRequest request = new PipelineStageRequest();
        request.setName("Discovery");
        request.setDisplayOrder(1);
        request.setIsActive(true);

        var response = pipelineStageService.createStage(request);

        assertThat(response.name()).isEqualTo("Discovery");
        assertThat(response.displayOrder()).isEqualTo(1);
    }

    @Test
    void reorderStages_incompleteList_rejected() {
        PipelineStage stage1 = stage(UUID.randomUUID(), "A", 1, true);
        PipelineStage stage2 = stage(UUID.randomUUID(), "B", 2, true);
        when(pipelineStageRepository.findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(companyId))
                .thenReturn(List.of(stage1, stage2));

        PipelineStageReorderRequest request = new PipelineStageReorderRequest();
        request.setOrderedStageIds(List.of(stage1.getId()));

        assertThatThrownBy(() -> pipelineStageService.reorderStages(request))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void deleteStage_softDisablesStage() {
        UUID stageId = UUID.randomUUID();
        PipelineStage stage = stage(stageId, "Proposal", 2, true);
        PipelineStage remaining = stage(UUID.randomUUID(), "Discovery", 5, true);
        when(pipelineStageRepository.findByIdAndCompanyId(stageId, companyId)).thenReturn(Optional.of(stage));
        when(pipelineStageRepository.findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(companyId))
                .thenReturn(List.of(remaining));

        pipelineStageService.deleteStage(stageId);

        assertThat(stage.getIsActive()).isFalse();
        verify(pipelineStageRepository).save(stage);
        assertThat(remaining.getDisplayOrder()).isEqualTo(1);
    }

    @Test
    void createStage_normalizesActiveOrder() {
        PipelineStage existing = stage(UUID.randomUUID(), "Proposal", 7, true);
        when(pipelineStageRepository.findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(companyId))
                .thenReturn(List.of(existing));

        PipelineStageRequest request = new PipelineStageRequest();
        request.setName("Discovery");
        request.setDisplayOrder(10);
        request.setIsActive(true);

        pipelineStageService.createStage(request);

        verify(pipelineStageRepository).findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(eq(companyId));
    }

    private PipelineStage stage(UUID id, String name, int order, boolean active) {
        PipelineStage stage = new PipelineStage();
        stage.setId(id);
        stage.setName(name);
        stage.setDisplayOrder(order);
        stage.setIsActive(active);
        return stage;
    }
}
