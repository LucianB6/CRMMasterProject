package com.salesway.ml.client;

import com.salesway.ml.dto.PredictRequest;
import com.salesway.ml.dto.PredictResponse;
import com.salesway.ml.dto.TrainRequest;
import com.salesway.ml.dto.TrainResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MlFastApiClient {
    private final RestTemplate restTemplate;

    public MlFastApiClient(RestTemplateBuilder restTemplateBuilder, @Value("${app.ml.base-url}") String baseUrl) {
        this.restTemplate = restTemplateBuilder
                .rootUri(baseUrl)
                .build();
    }

    public TrainResponse train(TrainRequest request) {
        ResponseEntity<TrainResponse> response = restTemplate.postForEntity(
                "/train",
                request,
                TrainResponse.class
        );

        if (response.getBody() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from ML service");
        }

        return response.getBody();
    }

    public PredictResponse predict(PredictRequest request) {
        ResponseEntity<PredictResponse> response = restTemplate.postForEntity(
                "/predict",
                request,
                PredictResponse.class
        );

        if (response.getBody() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from ML service");
        }

        return response.getBody();
    }
}
