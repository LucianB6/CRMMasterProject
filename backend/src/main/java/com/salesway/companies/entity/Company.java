package com.salesway.companies.entity;

import com.salesway.common.auditing.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

@Entity
@Table(name = "companies")
public class Company extends AuditedEntity {
    @NotBlank
    @Size(max = 255)
    @Column(name = "name", nullable = false)
    private String name;

    @NotBlank
    @Size(max = 64)
    @Column(name = "timezone", nullable = false)
    private String timezone;

    @Size(max = 64)
    @Column(name = "plan_code")
    private String planCode;

    @NotNull
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Size(max = 255)
    @Column(name = "stripe_customer_id")
    private String stripeCustomerId;

    @Size(max = 255)
    @Column(name = "stripe_subscription_id")
    private String stripeSubscriptionId;

    @Size(max = 255)
    @Column(name = "stripe_price_id")
    private String stripePriceId;

    @Size(max = 64)
    @Column(name = "subscription_status")
    private String subscriptionStatus;

    @Column(name = "subscription_current_period_end")
    private Instant subscriptionCurrentPeriodEnd;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public String getPlanCode() {
        return planCode;
    }

    public void setPlanCode(String planCode) {
        this.planCode = planCode;
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

    public String getStripePriceId() {
        return stripePriceId;
    }

    public void setStripePriceId(String stripePriceId) {
        this.stripePriceId = stripePriceId;
    }

    public String getSubscriptionStatus() {
        return subscriptionStatus;
    }

    public void setSubscriptionStatus(String subscriptionStatus) {
        this.subscriptionStatus = subscriptionStatus;
    }

    public Instant getSubscriptionCurrentPeriodEnd() {
        return subscriptionCurrentPeriodEnd;
    }

    public void setSubscriptionCurrentPeriodEnd(Instant subscriptionCurrentPeriodEnd) {
        this.subscriptionCurrentPeriodEnd = subscriptionCurrentPeriodEnd;
    }
}
