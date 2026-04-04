package com.salesway.manager.service;

import com.salesway.billing.service.SubscriptionAccessService;
import com.salesway.common.enums.MembershipRole;
import com.salesway.companies.entity.Company;
import com.salesway.email.service.EmailService;
import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import com.salesway.manager.dto.ManagerInviteCreateResponse;
import com.salesway.memberships.entity.CompanyMembership;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ManagerInvitationServiceTest {

    private InvitationRepository invitationRepository;
    private EmailService emailService;
    private SubscriptionAccessService subscriptionAccessService;
    private ManagerInvitationService service;

    private Company company;

    @BeforeEach
    void setUp() {
        invitationRepository = org.mockito.Mockito.mock(InvitationRepository.class);
        emailService = org.mockito.Mockito.mock(EmailService.class);
        subscriptionAccessService = org.mockito.Mockito.mock(SubscriptionAccessService.class);

        company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Acme");
        company.setTimezone("UTC");

        CompanyMembership managerMembership = new CompanyMembership();
        managerMembership.setId(UUID.randomUUID());
        managerMembership.setCompany(company);
        com.salesway.auth.entity.User managerUser = new com.salesway.auth.entity.User();
        managerUser.setEmail("manager@acme.com");
        managerMembership.setUser(managerUser);
        managerMembership.setRole(MembershipRole.MANAGER);

        ManagerAccessService managerAccessService = new ManagerAccessService(null, null) {
            @Override
            public CompanyMembership getManagerMembership() {
                return managerMembership;
            }
        };

        service = new ManagerInvitationService(
                managerAccessService,
                subscriptionAccessService,
                invitationRepository,
                emailService,
                "http://localhost:3000/invite/accept"
        );

        when(invitationRepository.save(any(Invitation.class))).thenAnswer(invocation -> {
            Invitation invitation = invocation.getArgument(0);
            if (invitation.getId() == null) {
                invitation.setId(UUID.randomUUID());
            }
            return invitation;
        });
    }

    @Test
    void createInvite_existingPending_resendsEmailAndReturnsSameToken() {
        Invitation existing = new Invitation();
        existing.setId(UUID.randomUUID());
        existing.setCompany(company);
        existing.setInvitedEmail("agent@example.com");
        existing.setToken("existing-token");
        existing.setStatus(InvitationStatus.PENDING);
        existing.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));

        when(invitationRepository.findFirstByCompanyIdAndInvitedEmailAndStatusOrderByCreatedAtDesc(
                eq(company.getId()),
                eq("agent@example.com"),
                eq(InvitationStatus.PENDING)
        )).thenReturn(Optional.of(existing));

        ManagerInviteCreateResponse response = service.createInvite("agent@example.com");

        assertThat(response.inviteToken()).isEqualTo("existing-token");
        verify(emailService, times(1)).sendInvitationEmail(any());
        verify(invitationRepository, times(0)).save(any(Invitation.class));
    }

    @Test
    void createInvite_noPending_createsAndSendsEmail() {
        when(invitationRepository.findFirstByCompanyIdAndInvitedEmailAndStatusOrderByCreatedAtDesc(
                eq(company.getId()),
                eq("newagent@example.com"),
                eq(InvitationStatus.PENDING)
        )).thenReturn(Optional.empty());

        ManagerInviteCreateResponse response = service.createInvite("newagent@example.com");

        assertThat(response.inviteToken()).isNotBlank();
        ArgumentCaptor<Invitation> invitationCaptor = ArgumentCaptor.forClass(Invitation.class);
        verify(invitationRepository).save(invitationCaptor.capture());
        assertThat(invitationCaptor.getValue().getStatus()).isEqualTo(InvitationStatus.PENDING);
        verify(emailService, times(1)).sendInvitationEmail(any());
    }

    @Test
    void createInvite_whenSeatLimitReached_returnsForbidden() {
        doThrow(new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN,
                "Plan seat limit reached"
        )).when(subscriptionAccessService).assertSeatAvailableForInvite(company);

        assertThatThrownBy(() -> service.createInvite("full@example.com"))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
                .hasMessageContaining("Plan seat limit reached");
    }
}
