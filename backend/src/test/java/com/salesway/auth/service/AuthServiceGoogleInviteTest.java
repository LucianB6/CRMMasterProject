package com.salesway.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.auth.dto.GoogleLoginRequest;
import com.salesway.auth.entity.User;
import com.salesway.auth.repository.PasswordResetTokenRepository;
import com.salesway.auth.repository.UserRepository;
import com.salesway.billing.service.SubscriptionAccessService;
import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.email.service.EmailService;
import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import com.salesway.manager.service.ManagerAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.notifications.service.NotificationService;
import com.salesway.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class AuthServiceGoogleInviteTest {

    private UserRepository userRepository;
    private CompanyMembershipRepository membershipRepository;
    private InvitationRepository invitationRepository;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = org.mockito.Mockito.mock(UserRepository.class);
        membershipRepository = org.mockito.Mockito.mock(CompanyMembershipRepository.class);
        invitationRepository = org.mockito.Mockito.mock(InvitationRepository.class);

        AuthenticationManager authenticationManager = authentication -> {
            throw new UnsupportedOperationException("not used in google invite tests");
        };

        CompanyRepository companyRepository = org.mockito.Mockito.mock(CompanyRepository.class);
        PasswordEncoder passwordEncoder = new PasswordEncoder() {
            @Override
            public String encode(CharSequence rawPassword) {
                return "encoded";
            }

            @Override
            public boolean matches(CharSequence rawPassword, String encodedPassword) {
                return true;
            }
        };

        NotificationService notificationService = new NotificationService(null, new ObjectMapper());
        ManagerAccessService managerAccessService = new ManagerAccessService(null, null) {
        };
        PasswordResetTokenRepository passwordResetTokenRepository = org.mockito.Mockito.mock(PasswordResetTokenRepository.class);
        EmailService emailService = org.mockito.Mockito.mock(EmailService.class);
        SubscriptionAccessService subscriptionAccessService = org.mockito.Mockito.mock(SubscriptionAccessService.class);

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier("960603321072-6g9an4d97grelbps1dtr03e1de9bi0ae.apps.googleusercontent.com") {
            @Override
            public GoogleTokenClaims verify(String idToken) {
                return new GoogleTokenClaims(
                        "sub-1",
                        "agent@example.com",
                        true,
                        "Agent Name",
                        null
                );
            }
        };

        JwtService jwtService = new JwtService("r7X4pQ9kV2mL8sZ1nA5tY6uH3fJ0wC9dr7X4pQ9kV2mL8sZ1", 3600);

        authService = new AuthService(
                authenticationManager,
                userRepository,
                jwtService,
                companyRepository,
                membershipRepository,
                passwordEncoder,
                notificationService,
                managerAccessService,
                verifier,
                invitationRepository,
                passwordResetTokenRepository,
                emailService,
                subscriptionAccessService,
                "http://localhost:3000/reset-password"
        );

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(membershipRepository.save(any(CompanyMembership.class))).thenAnswer(invocation -> {
            CompanyMembership membership = invocation.getArgument(0);
            if (membership.getId() == null) {
                membership.setId(UUID.randomUUID());
            }
            return membership;
        });
        when(invitationRepository.save(any(Invitation.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void googleInviteAccept_updatesProfile_createsMembership_acceptsInvite() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("agent@example.com");
        user.setGoogleSub("sub-1");

        Company company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Acme");
        company.setTimezone("UTC");

        Invitation invitation = new Invitation();
        invitation.setId(UUID.randomUUID());
        invitation.setCompany(company);
        invitation.setInvitedEmail("agent@example.com");
        invitation.setToken("invite-token");
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));

        when(userRepository.findByGoogleSub("sub-1")).thenReturn(Optional.of(user));
        when(invitationRepository.findByTokenForUpdate("invite-token")).thenReturn(Optional.of(invitation));
        when(membershipRepository.findByCompanyIdAndUserId(company.getId(), user.getId())).thenReturn(Optional.empty());

        GoogleLoginRequest request = new GoogleLoginRequest();
        request.setIdToken("token");
        request.setInviteToken("invite-token");
        request.setFirstName("Agent");
        request.setLastName("Updated");

        var response = authService.googleLogin(request);

        assertThat(response.getToken()).isNotBlank();
        assertThat(user.getFirstName()).isEqualTo("Agent");
        assertThat(user.getLastName()).isEqualTo("Updated");
        assertThat(invitation.getStatus()).isEqualTo(InvitationStatus.ACCEPTED);
        assertThat(invitation.getAcceptedAt()).isNotNull();
    }

    @Test
    void googleInviteAccept_missingProfile_returns400() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("agent@example.com");
        user.setGoogleSub("sub-1");
        when(userRepository.findByGoogleSub("sub-1")).thenReturn(Optional.of(user));

        GoogleLoginRequest request = new GoogleLoginRequest();
        request.setIdToken("token");
        request.setInviteToken("invite-token");

        assertThatThrownBy(() -> authService.googleLogin(request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void googleInviteAccept_emailMismatch_returns403() {
        GoogleIdTokenVerifier mismatchVerifier = new GoogleIdTokenVerifier("960603321072-6g9an4d97grelbps1dtr03e1de9bi0ae.apps.googleusercontent.com") {
            @Override
            public GoogleTokenClaims verify(String idToken) {
                return new GoogleTokenClaims("sub-2", "other@example.com", true, "Other", null);
            }
        };

        JwtService jwtService = new JwtService("r7X4pQ9kV2mL8sZ1nA5tY6uH3fJ0wC9dr7X4pQ9kV2mL8sZ1", 3600);

        authService = new AuthService(
                authentication -> { throw new UnsupportedOperationException(); },
                userRepository,
                jwtService,
                org.mockito.Mockito.mock(CompanyRepository.class),
                membershipRepository,
                new PasswordEncoder() {
                    @Override public String encode(CharSequence rawPassword) { return "enc"; }
                    @Override public boolean matches(CharSequence rawPassword, String encodedPassword) { return true; }
                },
                new NotificationService(null, new ObjectMapper()),
                new ManagerAccessService(null, null) {},
                mismatchVerifier,
                invitationRepository,
                org.mockito.Mockito.mock(PasswordResetTokenRepository.class),
                org.mockito.Mockito.mock(EmailService.class),
                org.mockito.Mockito.mock(SubscriptionAccessService.class),
                "http://localhost:3000/reset-password"
        );

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("other@example.com");
        user.setGoogleSub("sub-2");
        when(userRepository.findByGoogleSub("sub-2")).thenReturn(Optional.of(user));

        Company company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Acme");
        company.setTimezone("UTC");

        Invitation invitation = new Invitation();
        invitation.setCompany(company);
        invitation.setInvitedEmail("agent@example.com");
        invitation.setToken("invite-token");
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));
        when(invitationRepository.findByTokenForUpdate(eq("invite-token"))).thenReturn(Optional.of(invitation));

        GoogleLoginRequest request = new GoogleLoginRequest();
        request.setIdToken("token");
        request.setInviteToken("invite-token");
        request.setFirstName("Other");
        request.setLastName("User");

        assertThatThrownBy(() -> authService.googleLogin(request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void googleInviteAccept_alreadyUsed_returns403() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("agent@example.com");
        user.setGoogleSub("sub-1");

        Company company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Acme");
        company.setTimezone("UTC");

        Invitation invitation = new Invitation();
        invitation.setCompany(company);
        invitation.setInvitedEmail("agent@example.com");
        invitation.setToken("invite-token");
        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitation.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));

        when(userRepository.findByGoogleSub("sub-1")).thenReturn(Optional.of(user));
        when(invitationRepository.findByTokenForUpdate("invite-token")).thenReturn(Optional.of(invitation));

        GoogleLoginRequest request = new GoogleLoginRequest();
        request.setIdToken("token");
        request.setInviteToken("invite-token");
        request.setFirstName("Agent");
        request.setLastName("User");

        assertThatThrownBy(() -> authService.googleLogin(request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
