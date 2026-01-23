package com.salesway.notifications.repository;

import com.salesway.notifications.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientMembershipIdOrderByCreatedAtDesc(UUID recipientMembershipId);

    boolean existsByRecipientMembershipIdAndTypeAndScheduledForBetween(
            UUID recipientMembershipId,
            com.salesway.common.enums.NotificationType type,
            Instant start,
            Instant end
    );

    void deleteByRecipientMembershipId(UUID recipientMembershipId);
}
