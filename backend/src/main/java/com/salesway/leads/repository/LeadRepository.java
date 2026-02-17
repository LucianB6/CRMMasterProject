package com.salesway.leads.repository;

import com.salesway.leads.entity.Lead;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID> {
    Page<Lead> findByCompanyIdOrderBySubmittedAtDesc(UUID companyId, Pageable pageable);

    Page<Lead> findByCompanyIdAndStatusOrderBySubmittedAtDesc(UUID companyId, String status, Pageable pageable);

    Optional<Lead> findByIdAndCompanyId(UUID id, UUID companyId);
}
