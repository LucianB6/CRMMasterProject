package com.salesway.manager.service;

import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.CustomUserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.List;

@Service
public class ManagerAccessService {
    private final CompanyMembershipRepository companyMembershipRepository;

    public ManagerAccessService(CompanyMembershipRepository companyMembershipRepository) {
        this.companyMembershipRepository = companyMembershipRepository;
    }

    public CompanyMembership getManagerMembership() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication");
        }

        CompanyMembership membership = companyMembershipRepository
                .findFirstByUserIdAndRoleInAndStatusIn(
                        userDetails.getUser().getId(),
                        EnumSet.of(MembershipRole.MANAGER, MembershipRole.ADMIN),
                        EnumSet.of(MembershipStatus.ACTIVE)
                )
                .orElse(null);

        if (membership != null) {
            return membership;
        }

        CompanyMembership fallback = companyMembershipRepository
                .findFirstByUserIdAndStatusIn(
                        userDetails.getUser().getId(),
                        EnumSet.of(MembershipStatus.ACTIVE)
                )
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager access required"));

        List<CompanyMembership> managedAgents = companyMembershipRepository
                .findByManagerMembershipIdAndRoleAndStatusIn(
                        fallback.getId(),
                        MembershipRole.AGENT,
                        EnumSet.of(MembershipStatus.ACTIVE)
                );

        if (managedAgents.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Manager access required");
        }

        return fallback;
    }
}
