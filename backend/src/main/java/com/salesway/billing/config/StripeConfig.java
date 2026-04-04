package com.salesway.billing.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StripeConfig {
    private final StripeProperties stripeProperties;

    public StripeConfig(StripeProperties stripeProperties) {
        this.stripeProperties = stripeProperties;
    }

    @PostConstruct
    public void configureStripe() {
        Stripe.apiKey = stripeProperties.getSecretKey();
    }
}
