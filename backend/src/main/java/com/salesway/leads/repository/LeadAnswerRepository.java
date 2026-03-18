package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface LeadAnswerRepository extends JpaRepository<LeadAnswer, UUID> {
    List<LeadAnswer> findByLeadIdOrderByCreatedAtAsc(UUID leadId);

    List<LeadAnswer> findByLeadIdOrderByDisplayOrderSnapshotAscCreatedAtAsc(UUID leadId);

    List<LeadAnswer> findByLeadIdAndQuestionIdIn(UUID leadId, Collection<UUID> questionIds);

    @Query("""
            select max(a.createdAt) from LeadAnswer a
            where a.lead.id = :leadId
            """)
    Instant findLatestCreatedAtByLeadId(UUID leadId);
}
