package com.salesway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PredictionClientConfig {
    @Bean
    public WebClient predictionWebClient(AppProperties appProperties) {
        return WebClient.builder()
                .baseUrl(appProperties.getPrediction().getBaseUrl())
                .build();
    }
}
