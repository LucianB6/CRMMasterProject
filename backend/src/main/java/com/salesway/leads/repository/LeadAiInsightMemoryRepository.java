package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadAiInsightMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadAiInsightMemoryRepository extends JpaRepository<LeadAiInsightMemory, UUID> {
    List<LeadAiInsightMemory> findTop3ByLeadIdAndCompanyIdOrderByCreatedAtDesc(UUID leadId, UUID companyId);

    Optional<LeadAiInsightMemory> findByIdAndLeadIdAndCompanyId(UUID id, UUID leadId, UUID companyId);

    @Query("""
            select max(m.updatedAt) from LeadAiInsightMemory m
            where m.lead.id = :leadId and m.company.id = :companyId
            """)
    Instant findLatestUpdatedAtByLeadIdAndCompanyId(
            @Param("leadId") UUID leadId,
            @Param("companyId") UUID companyId
    );
}
