package com.salesway.leads.repository;

import com.salesway.leads.entity.PipelineStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PipelineStageRepository extends JpaRepository<PipelineStage, UUID> {
    Optional<PipelineStage> findByIdAndCompanyId(UUID id, UUID companyId);

    List<PipelineStage> findByCompanyIdOrderByDisplayOrderAsc(UUID companyId);

    List<PipelineStage> findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(UUID companyId);
}
