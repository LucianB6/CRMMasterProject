package com.salesway.manager.service;

import com.salesway.common.enums.MembershipRole;
import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import com.salesway.manager.dto.ManagerInviteCreateResponse;
import com.salesway.memberships.entity.CompanyMembership;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
public class ManagerInvitationService {
    private static final int TOKEN_BYTES = 32;
    private static final long INVITE_TTL_DAYS = 7;

    private final ManagerAccessService managerAccessService;
    private final InvitationRepository invitationRepository;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String inviteBaseUrl;

    public ManagerInvitationService(
            ManagerAccessService managerAccessService,
            InvitationRepository invitationRepository,
            @Value("${app.auth.invite-base-url:http://localhost:3000/invite/accept}") String inviteBaseUrl
    ) {
        this.managerAccessService = managerAccessService;
        this.invitationRepository = invitationRepository;
        this.inviteBaseUrl = inviteBaseUrl;
    }

    @Transactional
    public ManagerInviteCreateResponse createInvite(String emailRaw) {
        CompanyMembership managerMembership = managerAccessService.getManagerMembership();
        String invitedEmail = normalizeEmail(emailRaw);

        if (managerMembership.getUser().getEmail().equalsIgnoreCase(invitedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot invite your own email");
        }

        Invitation existingPending = invitationRepository
                .findFirstByCompanyIdAndInvitedEmailAndStatusOrderByCreatedAtDesc(
                        managerMembership.getCompany().getId(),
                        invitedEmail,
                        InvitationStatus.PENDING
                )
                .orElse(null);

        if (existingPending != null) {
            if (existingPending.getExpiresAt().isAfter(Instant.now())) {
                return toResponse(existingPending);
            }
            existingPending.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(existingPending);
        }

        Invitation invitation = new Invitation();
        invitation.setCompany(managerMembership.getCompany());
        invitation.setInvitedEmail(invitedEmail);
        invitation.setRole(MembershipRole.AGENT);
        invitation.setToken(generateToken());
        invitation.setStatus(InvitationStatus.PENDING);
        invitation.setExpiresAt(Instant.now().plus(INVITE_TTL_DAYS, ChronoUnit.DAYS));
        invitation = invitationRepository.save(invitation);

        return toResponse(invitation);
    }

    private ManagerInviteCreateResponse toResponse(Invitation invitation) {
        String inviteLink = inviteBaseUrl + "?token=" + invitation.getToken();
        return new ManagerInviteCreateResponse(
                invitation.getId(),
                invitation.getToken(),
                inviteLink,
                invitation.getExpiresAt(),
                invitation.getStatus().name()
        );
    }

    private String normalizeEmail(String emailRaw) {
        if (emailRaw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        return emailRaw.trim().toLowerCase();
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
