package com.salesway.leads.repository;

import com.salesway.leads.entity.LeadStandardFields;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadStandardFieldsRepository extends JpaRepository<LeadStandardFields, UUID> {
    Optional<LeadStandardFields> findByLeadId(UUID leadId);

    List<LeadStandardFields> findByLeadIdIn(List<UUID> leadIds);

    @Query("""
            select sf from LeadStandardFields sf
            join sf.lead l
            where l.company.id = :companyId
              and l.submittedAt >= :since
              and (
                    lower(sf.email) = lower(:email)
                    or sf.phone = :phone
              )
            order by l.submittedAt desc
            """)
    List<LeadStandardFields> findRecentPotentialDuplicates(
            @Param("companyId") UUID companyId,
            @Param("since") Instant since,
            @Param("email") String email,
            @Param("phone") String phone
    );
}
