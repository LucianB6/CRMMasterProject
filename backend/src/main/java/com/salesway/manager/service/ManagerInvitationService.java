package com.salesway.manager.service;

import com.salesway.common.enums.MembershipRole;
import com.salesway.billing.service.SubscriptionAccessService;
import com.salesway.email.dto.InvitationEmailPayload;
import com.salesway.email.service.EmailService;
import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import com.salesway.manager.dto.ManagerInviteCreateResponse;
import com.salesway.memberships.entity.CompanyMembership;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private static final Logger LOG = LoggerFactory.getLogger(ManagerInvitationService.class);
    private static final int TOKEN_BYTES = 32;
    private static final long INVITE_TTL_DAYS = 7;

    private final ManagerAccessService managerAccessService;
    private final SubscriptionAccessService subscriptionAccessService;
    private final InvitationRepository invitationRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String inviteBaseUrl;

    public ManagerInvitationService(
            ManagerAccessService managerAccessService,
            SubscriptionAccessService subscriptionAccessService,
            InvitationRepository invitationRepository,
            EmailService emailService,
            @Value("${app.auth.invite-base-url:http://localhost:3000/invite/accept}") String inviteBaseUrl
    ) {
        this.managerAccessService = managerAccessService;
        this.subscriptionAccessService = subscriptionAccessService;
        this.invitationRepository = invitationRepository;
        this.emailService = emailService;
        this.inviteBaseUrl = inviteBaseUrl;
    }

    @Transactional
    public ManagerInviteCreateResponse createInvite(String emailRaw) {
        CompanyMembership managerMembership = managerAccessService.getManagerMembership();
        subscriptionAccessService.assertSeatAvailableForInvite(managerMembership.getCompany());
        String senderEmail = managerMembership.getUser().getEmail();
        String invitedEmail = normalizeEmail(emailRaw);

        if (senderEmail.equalsIgnoreCase(invitedEmail)) {
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
                sendInviteEmail(existingPending, senderEmail);
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
        sendInviteEmail(invitation, senderEmail);

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

    private void sendInviteEmail(Invitation invitation, String senderEmail) {
        String inviteLink = inviteBaseUrl + "?token=" + invitation.getToken();
        try {
            emailService.sendInvitationEmail(new InvitationEmailPayload(
                    invitation.getInvitedEmail(),
                    senderEmail,
                    invitation.getCompany().getName(),
                    invitation.getExpiresAt(),
                    inviteLink
            ));
            LOG.info("Invitation email processed for {}", invitation.getInvitedEmail());
        } catch (RuntimeException ex) {
            LOG.error("Invitation email processing failed for {}", invitation.getInvitedEmail(), ex);
        }
    }
}
