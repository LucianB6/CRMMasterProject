package com.salesway.memberships.repository;

import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.common.enums.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyMembershipRepository extends JpaRepository<CompanyMembership, UUID> {
    Optional<CompanyMembership> findFirstByUserIdAndStatus(UUID userId, MembershipStatus status);
}
