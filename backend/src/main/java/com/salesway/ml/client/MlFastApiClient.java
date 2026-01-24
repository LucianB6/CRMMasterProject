package com.salesway.ml.client;

import com.salesway.ml.dto.PredictRequest;
import com.salesway.ml.dto.PredictResponse;
import com.salesway.ml.dto.TrainRequest;
import com.salesway.ml.dto.TrainResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MlFastApiClient {
    private final WebClient webClient;

    public MlFastApiClient(WebClient.Builder webClientBuilder, @Value("${app.ml.base-url}") String baseUrl) {
        this.webClient = webClientBuilder
                .baseUrl(baseUrl)
                .build();
    }

    public TrainResponse train(TrainRequest request) {
        TrainResponse response = webClient.post()
                .uri("/train")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(TrainResponse.class)
                .block();

        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from ML service");
        }

        return response;
    }

    public PredictResponse predict(PredictRequest request) {
        PredictResponse response = webClient.post()
                .uri("/predict")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(PredictResponse.class)
                .block();

        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Empty response from ML service");
        }

        return response;
    }
}
