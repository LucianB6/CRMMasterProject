package com.salesway.manager.service;

import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.CustomUserDetails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ManagerAccessService {
    private static final Logger LOG = LoggerFactory.getLogger(ManagerAccessService.class);

    private final CompanyMembershipRepository companyMembershipRepository;
    private final CompanyContextResolver companyContextResolver;

    public ManagerAccessService(
            CompanyMembershipRepository companyMembershipRepository,
            CompanyContextResolver companyContextResolver
    ) {
        this.companyMembershipRepository = companyMembershipRepository;
        this.companyContextResolver = companyContextResolver;
    }

    public CompanyMembership getManagerMembership() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication");
        }

        UUID userId = userDetails.getUser().getId();
        Optional<UUID> requestedCompanyId = companyContextResolver.resolveCompanyId();
        List<CompanyMembership> managerOrAdmin = companyMembershipRepository
                .findByUserIdAndRoleInAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                        userId,
                        EnumSet.of(MembershipRole.MANAGER, MembershipRole.ADMIN),
                        EnumSet.of(MembershipStatus.ACTIVE)
                );
        List<CompanyMembership> activeMemberships = companyMembershipRepository
                .findByUserIdAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                        userId,
                        EnumSet.of(MembershipStatus.ACTIVE)
                );

        CompanyMembership selected = requestedCompanyId
                .map(companyId -> resolveForRequestedCompany(userId, companyId, managerOrAdmin, activeMemberships))
                .orElseGet(() -> resolveWithoutRequestedCompany(userId, managerOrAdmin, activeMemberships));

        LOG.debug(
                "Manager context resolved userId={}, selectedMembershipId={}, selectedCompanyId={}, selectedCompanyName={}",
                userId,
                selected.getId(),
                selected.getCompany().getId(),
                selected.getCompany().getName()
        );
        return selected;
    }

    private CompanyMembership resolveForRequestedCompany(
            UUID userId,
            UUID companyId,
            List<CompanyMembership> managerOrAdmin,
            List<CompanyMembership> activeMemberships
    ) {
        for (CompanyMembership membership : managerOrAdmin) {
            if (membership.getCompany().getId().equals(companyId)) {
                return membership;
            }
        }
        for (CompanyMembership membership : activeMemberships) {
            if (membership.getCompany().getId().equals(companyId) && managesAgents(membership.getId())) {
                return membership;
            }
        }
        LOG.debug("Manager context rejected userId={}, requestedCompanyId={} - no eligible membership", userId, companyId);
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager access required");
    }

    private CompanyMembership resolveWithoutRequestedCompany(
            UUID userId,
            List<CompanyMembership> managerOrAdmin,
            List<CompanyMembership> activeMemberships
    ) {
        if (managerOrAdmin.size() == 1) {
            return managerOrAdmin.get(0);
        }
        if (managerOrAdmin.size() > 1) {
            LOG.debug("Manager context ambiguous userId={} managerMembershipCount={}", userId, managerOrAdmin.size());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ambiguous company context. Provide X-Company-Id");
        }

        List<CompanyMembership> legacyManagers = activeMemberships.stream()
                .filter(membership -> managesAgents(membership.getId()))
                .toList();
        if (legacyManagers.size() == 1) {
            return legacyManagers.get(0);
        }
        if (legacyManagers.size() > 1) {
            LOG.debug("Manager context ambiguous userId={} legacyManagedMembershipCount={}", userId, legacyManagers.size());
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ambiguous company context. Provide X-Company-Id");
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager access required");
    }

    private boolean managesAgents(UUID managerMembershipId) {
        List<CompanyMembership> managedAgents = companyMembershipRepository.findByManagerMembershipIdAndRoleAndStatusIn(
                managerMembershipId,
                MembershipRole.AGENT,
                EnumSet.of(MembershipStatus.ACTIVE)
        );
        return !managedAgents.isEmpty();
    }
}
