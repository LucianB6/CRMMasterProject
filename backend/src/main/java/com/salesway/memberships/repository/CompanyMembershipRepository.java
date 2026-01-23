package com.salesway.memberships.repository;

import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.memberships.entity.CompanyMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyMembershipRepository extends JpaRepository<CompanyMembership, UUID> {
    Optional<CompanyMembership> findFirstByUserIdAndStatus(UUID userId, MembershipStatus status);

    Optional<CompanyMembership> findFirstByUserIdAndStatusIn(UUID userId, Collection<MembershipStatus> statuses);

    Optional<CompanyMembership> findFirstByUserIdAndRoleInAndStatusIn(
            UUID userId,
            Collection<MembershipRole> roles,
            Collection<MembershipStatus> statuses
    );

    Optional<CompanyMembership> findFirstByUserId(UUID userId);

    Optional<CompanyMembership> findByCompanyIdAndId(UUID companyId, UUID membershipId);

    Optional<CompanyMembership> findByCompanyIdAndUserId(UUID companyId, UUID userId);

    List<CompanyMembership> findByCompanyIdAndRoleAndStatusIn(
            UUID companyId,
            MembershipRole role,
            Collection<MembershipStatus> statuses
    );

    Optional<CompanyMembership> findByIdAndManagerMembershipId(UUID membershipId, UUID managerMembershipId);

    Optional<CompanyMembership> findByManagerMembershipIdAndUserId(UUID managerMembershipId, UUID userId);

    List<CompanyMembership> findByManagerMembershipIdAndRoleAndStatusIn(
            UUID managerMembershipId,
            MembershipRole role,
            Collection<MembershipStatus> statuses
    );

    List<CompanyMembership> findByRoleAndStatusInAndManagerMembershipIsNotNull(
            MembershipRole role,
            Collection<MembershipStatus> statuses
    );

    Optional<CompanyMembership> findFirstByRoleInAndStatus(
            Collection<MembershipRole> roles,
            MembershipStatus status
    );

    Optional<CompanyMembership> findFirstByRoleAndStatus(MembershipRole role, MembershipStatus status);
}
