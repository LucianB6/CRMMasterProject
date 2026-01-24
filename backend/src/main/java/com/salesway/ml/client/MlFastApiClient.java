package com.salesway.ml.client;

import com.salesway.ml.dto.ForecastResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@Component
public class MlFastApiClient {
    private final RestTemplate restTemplate;

    public MlFastApiClient(RestTemplateBuilder restTemplateBuilder, @Value("${app.ml.base-url}") String baseUrl) {
        this.restTemplate = restTemplateBuilder
                .rootUri(baseUrl)
                .build();
    }

    public void refreshForecast(UUID companyId) {
        restTemplate.postForLocation(
                "/forecast/refresh",
                Map.of("company_id", companyId == null ? null : companyId.toString())
        );
    }

    public ForecastResponse getForecast(int periodDays, UUID companyId) {
        ForecastResponse response = restTemplate.getForObject(
                "/forecast?period={period}&company_id={companyId}",
                ForecastResponse.class,
                periodDays,
                companyId == null ? null : companyId.toString()
        );

        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from ML service");
        }

        return response;
    }
}
