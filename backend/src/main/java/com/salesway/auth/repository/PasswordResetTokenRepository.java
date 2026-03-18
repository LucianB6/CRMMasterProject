package com.salesway.auth.repository;

import com.salesway.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    List<PasswordResetToken> findAllByUserIdAndUsedAtIsNullAndExpiresAtAfter(UUID userId, Instant now);

    Optional<PasswordResetToken> findFirstByTokenHashAndUsedAtIsNullOrderByCreatedAtDesc(String tokenHash);
}
