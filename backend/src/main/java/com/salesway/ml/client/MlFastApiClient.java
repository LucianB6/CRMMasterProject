package com.salesway.ml.client;

import com.salesway.ml.dto.ForecastResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.UUID;

@Component
public class MlFastApiClient {
    private final PredictionClientService predictionClientService;

    public MlFastApiClient(PredictionClientService predictionClientService) {
        this.predictionClientService = predictionClientService;
    }

    public void refreshForecast(UUID companyId) {
        predictionClientService.post(
                        "/forecast/refresh",
                        Map.of("company_id", companyId == null ? null : companyId.toString())
                )
                .block();
    }

    public ForecastResponse getForecast(int periodDays, UUID companyId) {
        String path = UriComponentsBuilder.fromPath("/forecast")
                .queryParam("period", periodDays)
                .queryParam("company_id", companyId == null ? null : companyId.toString())
                .build()
                .toUriString();
        ForecastResponse response = predictionClientService.get(path, ForecastResponse.class).block();

        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from ML service");
        }

        return response;
    }
}
