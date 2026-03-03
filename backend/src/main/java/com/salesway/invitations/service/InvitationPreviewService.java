package com.salesway.invitations.service;

import com.salesway.invitations.dto.InvitationPreviewResponse;
import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class InvitationPreviewService {
    private final InvitationRepository invitationRepository;

    public InvitationPreviewService(InvitationRepository invitationRepository) {
        this.invitationRepository = invitationRepository;
    }

    @Transactional
    public InvitationPreviewResponse previewByToken(String token) {
        Invitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found"));

        if (invitation.getStatus() == InvitationStatus.PENDING && invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus(InvitationStatus.EXPIRED);
            invitationRepository.save(invitation);
        }

        return new InvitationPreviewResponse(
                invitation.getStatus().name(),
                invitation.getInvitedEmail(),
                invitation.getCompany().getName(),
                invitation.getExpiresAt()
        );
    }
}
