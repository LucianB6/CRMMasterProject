package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadAiInsightSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LeadAiInsightSnapshotRepository extends JpaRepository<LeadAiInsightSnapshot, UUID> {
    Optional<LeadAiInsightSnapshot> findByLeadIdAndCompanyId(UUID leadId, UUID companyId);
}
