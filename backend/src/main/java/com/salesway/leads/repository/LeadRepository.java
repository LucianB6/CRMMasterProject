package com.salesway.leads.repository;

import com.salesway.leads.entity.Lead;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID>, JpaSpecificationExecutor<Lead> {
    Page<Lead> findByCompanyIdOrderBySubmittedAtDesc(UUID companyId, Pageable pageable);

    Page<Lead> findByCompanyIdAndStatusOrderBySubmittedAtDesc(UUID companyId, String status, Pageable pageable);

    Optional<Lead> findByIdAndCompanyId(UUID id, UUID companyId);

    @Query("""
            select l from Lead l
            where l.company.id = :companyId
              and l.duplicateGroupId = :groupId
            order by l.submittedAt desc
            """)
    List<Lead> findByCompanyIdAndDuplicateGroupId(
            @Param("companyId") UUID companyId,
            @Param("groupId") UUID groupId
    );

    @Query("""
            select l.id from Lead l
            where l.company.id = :companyId
              and l.assignedToUserId = :userId
              and l.submittedAt >= :since
            """)
    List<UUID> findRecentLeadIdsForAssignee(
            @Param("companyId") UUID companyId,
            @Param("userId") UUID userId,
            @Param("since") Instant since
    );
}
