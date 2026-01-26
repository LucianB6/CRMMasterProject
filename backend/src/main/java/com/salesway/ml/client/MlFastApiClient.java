package com.salesway.ml.client;

import com.salesway.ml.dto.ForecastResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

@Component
public class MlFastApiClient {
    private final PredictionClientService predictionClientService;

    public MlFastApiClient(PredictionClientService predictionClientService) {
        this.predictionClientService = predictionClientService;
    }

    public void refreshForecast(UUID companyId) {
        Map<String, String> headers = resolveAuthHeader();
        predictionClientService.post(
                        "/forecast/refresh",
                        Map.of("company_id", companyId == null ? null : companyId.toString()),
                        headers
                )
                .block();
    }

    public ForecastResponse getForecast(int periodDays, UUID companyId) {
        Map<String, String> headers = resolveAuthHeader();
        String path = UriComponentsBuilder.fromPath("/forecast")
                .queryParam("period", periodDays)
                .queryParam("company_id", companyId == null ? null : companyId.toString())
                .build()
                .toUriString();
        ForecastResponse response = predictionClientService.get(path, ForecastResponse.class, headers).block();

        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from ML service");
        }

        return response;
    }

    private Map<String, String> resolveAuthHeader() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null || attributes.getRequest() == null) {
            return Map.of();
        }
        String authHeader = attributes.getRequest().getHeader("Authorization");
        if (authHeader == null || authHeader.isBlank()) {
            return Map.of();
        }
        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", authHeader);
        return headers;
    }
}
