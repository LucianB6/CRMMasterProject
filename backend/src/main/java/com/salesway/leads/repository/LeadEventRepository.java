package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadEvent;
import com.salesway.leads.enums.LeadEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.UUID;

public interface LeadEventRepository extends JpaRepository<LeadEvent, UUID> {
    Page<LeadEvent> findByCompanyIdAndLeadIdOrderByCreatedAtDesc(UUID companyId, UUID leadId, Pageable pageable);

    Page<LeadEvent> findByCompanyIdAndLeadIdAndTypeInOrderByCreatedAtDesc(
            UUID companyId,
            UUID leadId,
            Collection<LeadEventType> types,
            Pageable pageable
    );
}
