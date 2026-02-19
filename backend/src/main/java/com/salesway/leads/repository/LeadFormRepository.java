package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadForm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LeadFormRepository extends JpaRepository<LeadForm, UUID> {
    Optional<LeadForm> findByCompanyId(UUID companyId);

    Optional<LeadForm> findByPublicSlugAndIsActiveTrue(String publicSlug);
}
