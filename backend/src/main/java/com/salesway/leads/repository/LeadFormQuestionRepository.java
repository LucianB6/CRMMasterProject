package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadFormQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadFormQuestionRepository extends JpaRepository<LeadFormQuestion, UUID> {
    List<LeadFormQuestion> findByLeadFormIdAndIsActiveTrueOrderByDisplayOrderAsc(UUID leadFormId);

    List<LeadFormQuestion> findByLeadFormIdAndIsActiveTrue(UUID leadFormId);

    List<LeadFormQuestion> findByLeadFormIdAndIdIn(UUID leadFormId, Collection<UUID> ids);

    Optional<LeadFormQuestion> findByIdAndLeadFormId(UUID id, UUID leadFormId);
}
