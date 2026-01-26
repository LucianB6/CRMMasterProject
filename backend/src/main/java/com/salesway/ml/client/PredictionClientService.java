package com.salesway.ml.client;

import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@Service
public class PredictionClientService {
    private final WebClient predictionWebClient;

    public PredictionClientService(WebClient predictionWebClient) {
        this.predictionWebClient = predictionWebClient;
    }

    public <T> Mono<T> get(String path, Class<T> responseType) {
        return get(path, responseType, Map.of());
    }

    public <T> Mono<T> get(String path, Class<T> responseType, Map<String, String> headers) {
        return predictionWebClient.get()
                .uri(path)
                .headers(httpHeaders -> headers.forEach(httpHeaders::set))
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .flatMap(body -> Mono.error(new IllegalStateException(
                                "Prediction service GET failed: " + response.statusCode() + " " + body))))
                .bodyToMono(responseType);
    }

    public <T> Mono<T> post(String path, Object body, Class<T> responseType) {
        return post(path, body, responseType, Map.of());
    }

    public <T> Mono<T> post(String path, Object body, Class<T> responseType, Map<String, String> headers) {
        return predictionWebClient.post()
                .uri(path)
                .headers(httpHeaders -> headers.forEach(httpHeaders::set))
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .flatMap(bodyText -> Mono.error(new IllegalStateException(
                                "Prediction service POST failed: " + response.statusCode() + " " + bodyText))))
                .bodyToMono(responseType);
    }

    public Mono<Void> post(String path, Object body) {
        return post(path, body, Map.of());
    }

    public Mono<Void> post(String path, Object body, Map<String, String> headers) {
        return predictionWebClient.post()
                .uri(path)
                .headers(httpHeaders -> headers.forEach(httpHeaders::set))
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .flatMap(bodyText -> Mono.error(new IllegalStateException(
                                "Prediction service POST failed: " + response.statusCode() + " " + bodyText))))
                .bodyToMono(Void.class);
    }
}
