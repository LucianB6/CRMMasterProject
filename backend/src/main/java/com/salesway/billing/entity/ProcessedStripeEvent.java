package com.salesway.billing.entity;

import com.salesway.common.auditing.CreatedOnlyEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(
        name = "processed_stripe_events",
        uniqueConstraints = @UniqueConstraint(name = "uq_processed_stripe_events_event_id", columnNames = "stripe_event_id")
)
public class ProcessedStripeEvent extends CreatedOnlyEntity {
    @NotBlank
    @Size(max = 255)
    @Column(name = "stripe_event_id", nullable = false, updatable = false)
    private String stripeEventId;

    @NotBlank
    @Size(max = 128)
    @Column(name = "stripe_event_type", nullable = false, updatable = false)
    private String stripeEventType;

    public String getStripeEventId() {
        return stripeEventId;
    }

    public void setStripeEventId(String stripeEventId) {
        this.stripeEventId = stripeEventId;
    }

    public String getStripeEventType() {
        return stripeEventType;
    }

    public void setStripeEventType(String stripeEventType) {
        this.stripeEventType = stripeEventType;
    }
}
