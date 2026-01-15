package com.salesway.notifications.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.common.enums.NotificationStatus;
import com.salesway.common.enums.NotificationType;
import com.salesway.companies.entity.Company;
import com.salesway.memberships.entity.CompanyMembership;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

@Entity
@Table(name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_recipient", columnList = "recipient_membership_id, status"),
                @Index(name = "idx_notifications_company", columnList = "company_id")
        })
public class Notification extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_membership_id", nullable = false)
    private CompanyMembership recipientMembership;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private NotificationType type;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private NotificationStatus status;

    @NotNull
    @Column(name = "scheduled_for", nullable = false)
    private Instant scheduledFor;

    @Column(name = "sent_at")
    private Instant sentAt;

    @NotBlank
    @Column(name = "payload_json", nullable = false, columnDefinition = "text")
    private String payloadJsonText;

    public Company getCompany() {
        return company;
    }

    public void setCompany(Company company) {
        this.company = company;
    }

    public CompanyMembership getRecipientMembership() {
        return recipientMembership;
    }

    public void setRecipientMembership(CompanyMembership recipientMembership) {
        this.recipientMembership = recipientMembership;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public NotificationStatus getStatus() {
        return status;
    }

    public void setStatus(NotificationStatus status) {
        this.status = status;
    }

    public Instant getScheduledFor() {
        return scheduledFor;
    }

    public void setScheduledFor(Instant scheduledFor) {
        this.scheduledFor = scheduledFor;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public String getPayloadJsonText() {
        return payloadJsonText;
    }

    public void setPayloadJsonText(String payloadJsonText) {
        this.payloadJsonText = payloadJsonText;
    }
}
