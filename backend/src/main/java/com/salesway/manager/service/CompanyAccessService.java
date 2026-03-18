package com.salesway.manager.service;

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
import java.util.Optional;
import java.util.UUID;

@Service
public class CompanyAccessService {
    private final CompanyMembershipRepository companyMembershipRepository;
    private final CompanyContextResolver companyContextResolver;

    public CompanyAccessService(
            CompanyMembershipRepository companyMembershipRepository,
            CompanyContextResolver companyContextResolver
    ) {
        this.companyMembershipRepository = companyMembershipRepository;
        this.companyContextResolver = companyContextResolver;
    }

    public CompanyMembership getActiveMembership() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication");
        }

        UUID userId = userDetails.getUser().getId();
        List<CompanyMembership> activeMemberships = companyMembershipRepository
                .findByUserIdAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                        userId,
                        EnumSet.of(MembershipStatus.ACTIVE)
                );
        if (activeMemberships.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Active company membership required");
        }

        Optional<UUID> requestedCompanyId = companyContextResolver.resolveCompanyId();
        if (requestedCompanyId.isPresent()) {
            UUID companyId = requestedCompanyId.get();
            return activeMemberships.stream()
                    .filter(membership -> membership.getCompany().getId().equals(companyId))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Membership not found for requested company"));
        }

        if (activeMemberships.size() == 1) {
            return activeMemberships.get(0);
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Ambiguous company context. Provide X-Company-Id");
    }
}
