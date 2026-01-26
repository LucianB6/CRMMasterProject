package com.salesway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PredictionClientConfig {
    @Bean
    public WebClient predictionWebClient(AppProperties appProperties) {
        WebClient.Builder builder = WebClient.builder()
                .baseUrl(appProperties.getPrediction().getBaseUrl());
        String apiKey = appProperties.getPrediction().getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            String headerName = appProperties.getPrediction().getApiKeyHeader();
            String resolvedHeader = headerName == null || headerName.isBlank() ? "X-API-Key" : headerName;
            builder.defaultHeader(resolvedHeader, apiKey);
        }
        return builder.build();
    }
}
