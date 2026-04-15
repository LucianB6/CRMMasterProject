package com.salesway.billing.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "stripe")
public class StripeProperties {
    @NotBlank
    private String secretKey;

    @NotBlank
    private String webhookSecret;

    @NotBlank
    private String starterPriceId;

    @NotBlank
    private String proPriceId;

    @NotBlank
    private String enterprisePriceId;

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public void setWebhookSecret(String webhookSecret) {
        this.webhookSecret = webhookSecret;
    }

    public String getStarterPriceId() {
        return starterPriceId;
    }

    public void setStarterPriceId(String starterPriceId) {
        this.starterPriceId = starterPriceId;
    }

    public String getProPriceId() {
        return proPriceId;
    }

    public void setProPriceId(String proPriceId) {
        this.proPriceId = proPriceId;
    }

    public String getEnterprisePriceId() {
        return enterprisePriceId;
    }

    public void setEnterprisePriceId(String enterprisePriceId) {
        this.enterprisePriceId = enterprisePriceId;
    }
}
