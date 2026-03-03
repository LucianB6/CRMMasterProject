package com.salesway.invitations.repository;

import com.salesway.invitations.entity.Invitation;
import com.salesway.invitations.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface InvitationRepository extends JpaRepository<Invitation, UUID> {
    Optional<Invitation> findByToken(String token);

    Optional<Invitation> findFirstByCompanyIdAndInvitedEmailAndStatusOrderByCreatedAtDesc(
            UUID companyId,
            String invitedEmail,
            InvitationStatus status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invitation i join fetch i.company where i.token = :token")
    Optional<Invitation> findByTokenForUpdate(@Param("token") String token);
}
