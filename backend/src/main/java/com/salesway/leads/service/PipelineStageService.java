package com.salesway.leads.service;

import com.salesway.leads.dto.PipelineStageReorderRequest;
import com.salesway.leads.dto.PipelineStageRequest;
import com.salesway.leads.dto.PipelineStageResponse;
import com.salesway.leads.entity.PipelineStage;
import com.salesway.leads.repository.PipelineStageRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PipelineStageService {
    private final PipelineStageRepository pipelineStageRepository;
    private final ManagerAccessService managerAccessService;

    public PipelineStageService(
            PipelineStageRepository pipelineStageRepository,
            ManagerAccessService managerAccessService
    ) {
        this.pipelineStageRepository = pipelineStageRepository;
        this.managerAccessService = managerAccessService;
    }

    @Transactional(readOnly = true)
    public List<PipelineStageResponse> listStages(boolean activeOnly) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        UUID companyId = membership.getCompany().getId();
        List<PipelineStage> stages = activeOnly
                ? pipelineStageRepository.findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(companyId)
                : pipelineStageRepository.findByCompanyIdOrderByDisplayOrderAsc(companyId);
        return stages.stream().map(this::toResponse).toList();
    }

    @Transactional
    public PipelineStageResponse createStage(PipelineStageRequest request) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        PipelineStage stage = new PipelineStage();
        stage.setCompany(membership.getCompany());
        applyRequest(stage, request);
        PipelineStage saved = pipelineStageRepository.save(stage);
        normalizeActiveStageOrder(membership.getCompany().getId());
        return toResponse(saved);
    }

    @Transactional
    public PipelineStageResponse updateStage(UUID stageId, PipelineStageRequest request) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        PipelineStage stage = getStageOrThrow(stageId, membership.getCompany().getId());
        applyRequest(stage, request);
        PipelineStage saved = pipelineStageRepository.save(stage);
        normalizeActiveStageOrder(membership.getCompany().getId());
        return toResponse(saved);
    }

    @Transactional
    public void reorderStages(PipelineStageReorderRequest request) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        UUID companyId = membership.getCompany().getId();
        List<PipelineStage> activeStages = pipelineStageRepository.findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(companyId);
        List<UUID> orderedIds = request.getOrderedStageIds();
        if (orderedIds.size() != activeStages.size() || new HashSet<>(orderedIds).size() != orderedIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orderedStageIds must include all active stage ids exactly once");
        }
        Map<UUID, PipelineStage> byId = new HashMap<>();
        for (PipelineStage stage : activeStages) {
            byId.put(stage.getId(), stage);
        }
        for (int index = 0; index < orderedIds.size(); index++) {
            PipelineStage stage = byId.get(orderedIds.get(index));
            if (stage == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stageId does not belong to current company: " + orderedIds.get(index));
            }
            stage.setDisplayOrder(index + 1);
        }
        pipelineStageRepository.saveAll(activeStages);
    }

    @Transactional
    public void deleteStage(UUID stageId) {
        CompanyMembership membership = managerAccessService.getManagerMembership();
        PipelineStage stage = getStageOrThrow(stageId, membership.getCompany().getId());
        stage.setIsActive(false);
        pipelineStageRepository.save(stage);
        normalizeActiveStageOrder(membership.getCompany().getId());
    }

    public PipelineStage getStageOrThrow(UUID stageId, UUID companyId) {
        return pipelineStageRepository.findByIdAndCompanyId(stageId, companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pipeline stage not found"));
    }

    private void applyRequest(PipelineStage stage, PipelineStageRequest request) {
        if (request.getDisplayOrder() < 1) {
            throw new IllegalArgumentException("displayOrder must be >= 1");
        }
        stage.setName(request.getName().trim());
        stage.setDisplayOrder(request.getDisplayOrder());
        stage.setIsActive(Boolean.TRUE.equals(request.getIsActive()));
    }

    private PipelineStageResponse toResponse(PipelineStage stage) {
        return new PipelineStageResponse(stage.getId(), stage.getName(), stage.getDisplayOrder(), stage.getIsActive());
    }

    private void normalizeActiveStageOrder(UUID companyId) {
        List<PipelineStage> activeStages = pipelineStageRepository.findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(companyId);
        for (int index = 0; index < activeStages.size(); index++) {
            activeStages.get(index).setDisplayOrder(index + 1);
        }
        if (!activeStages.isEmpty()) {
            pipelineStageRepository.saveAll(activeStages);
        }
    }
}
