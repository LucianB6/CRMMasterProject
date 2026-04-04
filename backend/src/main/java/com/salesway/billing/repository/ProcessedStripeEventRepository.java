package com.salesway.billing.repository;

import com.salesway.billing.entity.ProcessedStripeEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProcessedStripeEventRepository extends JpaRepository<ProcessedStripeEvent, UUID> {
    boolean existsByStripeEventId(String stripeEventId);
}
