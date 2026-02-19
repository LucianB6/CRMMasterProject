package com.salesway.invitations.repository;

import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {
    Optional<Invitation> findByToken(String token);

    Optional<Invitation> findFirstByCompanyIdAndInvitedEmailAndStatusOrderByCreatedAtDesc(
            UUID companyId,
            String invitedEmail,
            InvitationStatus status
    );
}
