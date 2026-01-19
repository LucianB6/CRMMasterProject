package com.salesway.manager.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.salesway.common.enums.NotificationStatus;
import com.salesway.common.enums.NotificationType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class ManagerNotificationResponse {
    @JsonProperty("id")
    private final UUID id;

    @JsonProperty("type")
    private final NotificationType type;

    @JsonProperty("status")
    private final NotificationStatus status;

    @JsonProperty("created_at")
    private final Instant createdAt;

    @JsonProperty("scheduled_for")
    private final Instant scheduledFor;

    @JsonProperty("payload")
    private final Map<String, Object> payload;

    public ManagerNotificationResponse(
            UUID id,
            NotificationType type,
            NotificationStatus status,
            Instant createdAt,
            Instant scheduledFor,
            Map<String, Object> payload
    ) {
        this.id = id;
        this.type = type;
        this.status = status;
        this.createdAt = createdAt;
        this.scheduledFor = scheduledFor;
        this.payload = payload;
    }

    public UUID getId() {
        return id;
    }

    public NotificationType getType() {
        return type;
    }

    public NotificationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getScheduledFor() {
        return scheduledFor;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }
}
