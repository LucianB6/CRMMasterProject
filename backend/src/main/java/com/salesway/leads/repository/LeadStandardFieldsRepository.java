package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadStandardFields;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LeadStandardFieldsRepository extends JpaRepository<LeadStandardFields, UUID> {
    Optional<LeadStandardFields> findByLeadId(UUID leadId);
}
