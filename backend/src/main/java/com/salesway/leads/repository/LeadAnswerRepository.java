package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeadAnswerRepository extends JpaRepository<LeadAnswer, UUID> {
    List<LeadAnswer> findByLeadIdOrderByCreatedAtAsc(UUID leadId);
}
