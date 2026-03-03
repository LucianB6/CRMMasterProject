package com.salesway.manager.service;

import com.salesway.auth.entity.User;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ManagerAccessServiceTest {

    private CompanyMembershipRepository companyMembershipRepository;
    private CompanyContextResolver companyContextResolver;
    private ManagerAccessService managerAccessService;
    private UUID userId;

    @BeforeEach
    void setUp() {
        companyMembershipRepository = mock(CompanyMembershipRepository.class);
        companyContextResolver = mock(CompanyContextResolver.class);
        managerAccessService = new ManagerAccessService(companyMembershipRepository, companyContextResolver);

        userId = UUID.randomUUID();
        User user = new User();
        user.setId(userId);
        user.setEmail("manager@test.com");
        user.setPasswordHash("x");
        CustomUserDetails principal = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void singleCompanyManagerMembership_returnsSelectedMembership() {
        CompanyMembership crmMembership = managerMembership("CRMSalesWay", UUID.randomUUID(), UUID.randomUUID());
        when(companyContextResolver.resolveCompanyId()).thenReturn(Optional.empty());
        when(companyMembershipRepository.findByUserIdAndRoleInAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                eq(userId), any(), any()
        )).thenReturn(List.of(crmMembership));
        when(companyMembershipRepository.findByUserIdAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                eq(userId), any()
        )).thenReturn(List.of(crmMembership));

        CompanyMembership selected = managerAccessService.getManagerMembership();
        assertThat(selected.getCompany().getName()).isEqualTo("CRMSalesWay");
    }

    @Test
    void multipleManagerMemberships_withRequestedCompany_selectsCorrectCompany() {
        UUID crmCompanyId = UUID.randomUUID();
        UUID otherCompanyId = UUID.randomUUID();
        CompanyMembership otherMembership = managerMembership("OtherCo", otherCompanyId, UUID.randomUUID());
        CompanyMembership crmMembership = managerMembership("CRMSalesWay", crmCompanyId, UUID.randomUUID());

        when(companyContextResolver.resolveCompanyId()).thenReturn(Optional.of(crmCompanyId));
        when(companyMembershipRepository.findByUserIdAndRoleInAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                eq(userId), any(), any()
        )).thenReturn(List.of(otherMembership, crmMembership));
        when(companyMembershipRepository.findByUserIdAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                eq(userId), any()
        )).thenReturn(List.of(otherMembership, crmMembership));

        CompanyMembership selected = managerAccessService.getManagerMembership();
        assertThat(selected.getCompany().getId()).isEqualTo(crmCompanyId);
    }

    @Test
    void multipleManagerMemberships_withoutCompanyContext_throwsAmbiguousContext() {
        CompanyMembership first = managerMembership("A", UUID.randomUUID(), UUID.randomUUID());
        CompanyMembership second = managerMembership("B", UUID.randomUUID(), UUID.randomUUID());

        when(companyContextResolver.resolveCompanyId()).thenReturn(Optional.empty());
        when(companyMembershipRepository.findByUserIdAndRoleInAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                eq(userId), any(), any()
        )).thenReturn(List.of(first, second));
        when(companyMembershipRepository.findByUserIdAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                eq(userId), any()
        )).thenReturn(List.of(first, second));

        assertThatThrownBy(() -> managerAccessService.getManagerMembership())
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Ambiguous company context");
    }

    @Test
    void reproducesOldBugScenario_requestedCrmCompanyAvoidsWrongFirstMembership() {
        UUID crmCompanyId = UUID.randomUUID();
        CompanyMembership wrongFirst = managerMembership("Personal Workspace", UUID.randomUUID(), UUID.randomUUID());
        CompanyMembership crmMembership = managerMembership("CRMSalesWay", crmCompanyId, UUID.randomUUID());

        when(companyContextResolver.resolveCompanyId()).thenReturn(Optional.of(crmCompanyId));
        when(companyMembershipRepository.findByUserIdAndRoleInAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                eq(userId),
                eq(EnumSet.of(MembershipRole.MANAGER, MembershipRole.ADMIN)),
                eq(EnumSet.of(MembershipStatus.ACTIVE))
        )).thenReturn(List.of(wrongFirst, crmMembership));
        when(companyMembershipRepository.findByUserIdAndStatusInOrderByUpdatedAtDescCreatedAtDescIdDesc(
                eq(userId),
                eq(EnumSet.of(MembershipStatus.ACTIVE))
        )).thenReturn(List.of(wrongFirst, crmMembership));

        CompanyMembership selected = managerAccessService.getManagerMembership();
        assertThat(selected.getCompany().getName()).isEqualTo("CRMSalesWay");
    }

    private CompanyMembership managerMembership(String companyName, UUID companyId, UUID membershipId) {
        Company company = new Company();
        company.setId(companyId);
        company.setName(companyName);
        company.setTimezone("UTC");

        User user = new User();
        user.setId(userId);

        CompanyMembership membership = new CompanyMembership();
        membership.setId(membershipId);
        membership.setUser(user);
        membership.setCompany(company);
        membership.setRole(MembershipRole.MANAGER);
        membership.setStatus(MembershipStatus.ACTIVE);
        return membership;
    }
}
