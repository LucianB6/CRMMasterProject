package com.salesway.billing.repository;

import com.salesway.billing.entity.PendingSignup;
import com.salesway.billing.entity.PendingSignupStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PendingSignupRepository extends JpaRepository<PendingSignup, UUID> {
    Optional<PendingSignup> findByStripeCheckoutSessionId(String stripeCheckoutSessionId);

    boolean existsByEmailIgnoreCaseAndStatusIn(String email, Iterable<PendingSignupStatus> statuses);
}
