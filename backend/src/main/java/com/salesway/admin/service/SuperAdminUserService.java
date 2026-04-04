package com.salesway.admin.service;

import com.salesway.admin.dto.SuperAdminUserListItemResponse;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.UserRepository;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class SuperAdminUserService {
    private final UserRepository userRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final SuperAdminAccessService superAdminAccessService;

    public SuperAdminUserService(
            UserRepository userRepository,
            CompanyMembershipRepository companyMembershipRepository,
            SuperAdminAccessService superAdminAccessService
    ) {
        this.userRepository = userRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.superAdminAccessService = superAdminAccessService;
    }

    @Transactional(readOnly = true)
    public List<SuperAdminUserListItemResponse> listUsers() {
        superAdminAccessService.getSuperAdminUser();
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toResponse)
                .toList();
    }

    private SuperAdminUserListItemResponse toResponse(User user) {
        List<CompanyMembership> memberships = companyMembershipRepository.findByUserId(user.getId());
        return new SuperAdminUserListItemResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPlatformRole().name(),
                Boolean.TRUE.equals(user.getIsActive()),
                user.getLastLoginAt(),
                memberships.stream()
                        .map(membership -> membership.getCompany().getName())
                        .distinct()
                        .toList(),
                memberships.stream()
                        .map(membership -> membership.getRole().name().toLowerCase(Locale.ROOT))
                        .distinct()
                        .toList()
        );
    }
}
