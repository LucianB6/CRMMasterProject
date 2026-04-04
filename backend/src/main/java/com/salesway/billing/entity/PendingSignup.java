package com.salesway.billing.entity;

import com.salesway.common.auditing.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pending_signups")
public class PendingSignup extends AuditedEntity {
    @NotBlank
    @Size(max = 255)
    @Column(name = "email", nullable = false)
    private String email;

    @NotBlank
    @Size(max = 255)
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @NotBlank
    @Size(max = 255)
    @Column(name = "first_name", nullable = false)
    private String firstName;

    @NotBlank
    @Size(max = 255)
    @Column(name = "last_name", nullable = false)
    private String lastName;

    @NotBlank
    @Size(max = 255)
    @Column(name = "company_name", nullable = false)
    private String companyName;

    @NotBlank
    @Size(max = 64)
    @Column(name = "plan_code", nullable = false)
    private String planCode;

    @NotBlank
    @Size(max = 128)
    @Column(name = "lookup_key", nullable = false)
    private String lookupKey;

    @Size(max = 255)
    @Column(name = "stripe_checkout_session_id", unique = true)
    private String stripeCheckoutSessionId;

    @Size(max = 255)
    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;

    @Size(max = 255)
    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;

    @Column(name = "completed_user_id")
    private UUID completedUserId;

    @Column(name = "completed_company_id")
    private UUID completedCompanyId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PendingSignupStatus status = PendingSignupStatus.PENDING;

    @Size(max = 500)
    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "completed_at")
    private Instant completedAt;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
    }

    public String getLookupKey() {
        return lookupKey;
    }

    public void setLookupKey(String lookupKey) {
        this.lookupKey = lookupKey;
    }

    public String getStripeCheckoutSessionId() {
        return stripeCheckoutSessionId;
    }

    public void setStripeCheckoutSessionId(String stripeCheckoutSessionId) {
        this.stripeCheckoutSessionId = stripeCheckoutSessionId;
    }

    public String getStripeCustomerId() {
        return stripeCustomerId;
    }

    public void setStripeCustomerId(String stripeCustomerId) {
        this.stripeCustomerId = stripeCustomerId;
    }

    public String getStripeSubscriptionId() {
        return stripeSubscriptionId;
    }

    public void setStripeSubscriptionId(String stripeSubscriptionId) {
        this.stripeSubscriptionId = stripeSubscriptionId;
    }

    public UUID getCompletedUserId() {
        return completedUserId;
    }

    public void setCompletedUserId(UUID completedUserId) {
        this.completedUserId = completedUserId;
    }

    public UUID getCompletedCompanyId() {
        return completedCompanyId;
    }

    public void setCompletedCompanyId(UUID completedCompanyId) {
        this.completedCompanyId = completedCompanyId;
    }

    public PendingSignupStatus getStatus() {
        return status;
    }

    public void setStatus(PendingSignupStatus status) {
        this.status = status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
