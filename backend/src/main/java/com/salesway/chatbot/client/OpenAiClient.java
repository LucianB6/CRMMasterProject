package com.salesway.chatbot.client;

import com.salesway.config.AppProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
public class OpenAiClient {
    private final WebClient webClient;
    private final AppProperties appProperties;

    public OpenAiClient(WebClient.Builder builder, AppProperties appProperties) {
        this.appProperties = appProperties;
        WebClient.Builder clientBuilder = builder.baseUrl(appProperties.getOpenAi().getBaseUrl());
        String apiKey = appProperties.getOpenAi().getApiKey();
        if (apiKey != null && !apiKey.isBlank()) {
            clientBuilder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
        }
        this.webClient = clientBuilder.build();
    }

    public List<Double> embed(String input) {
        assertApiKeyConfigured();
        EmbeddingsRequest request = new EmbeddingsRequest(appProperties.getOpenAi().getEmbeddingModel(), input);
        EmbeddingsResponse response = webClient.post()
                .uri("/embeddings")
                .bodyValue(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp -> resp.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .flatMap(body -> Mono.error(new IllegalStateException(
                                "OpenAI embeddings failed: " + resp.statusCode() + " " + body))))
                .bodyToMono(EmbeddingsResponse.class)
                .block();

        if (response == null || response.data == null || response.data.isEmpty()) {
            throw new IllegalStateException("OpenAI embeddings response was empty");
        }
        return response.data.get(0).embedding;
    }

    public String chat(List<Map<String, String>> messages, double temperature) {
        assertApiKeyConfigured();
        ChatCompletionsRequest request = new ChatCompletionsRequest(
                appProperties.getOpenAi().getChatModel(),
                messages,
                temperature
        );

        ChatCompletionsResponse response = webClient.post()
                .uri("/chat/completions")
                .bodyValue(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp -> resp.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .flatMap(body -> Mono.error(new IllegalStateException(
                                "OpenAI chat failed: " + resp.statusCode() + " " + body))))
                .bodyToMono(ChatCompletionsResponse.class)
                .block();

        if (response == null || response.choices == null || response.choices.isEmpty()
                || response.choices.get(0).message == null) {
            throw new IllegalStateException("OpenAI chat response was empty");
        }
        return response.choices.get(0).message.content;
    }

    private record EmbeddingsRequest(String model, String input) {}

    private record EmbeddingsResponse(List<EmbeddingData> data) {}

    private record EmbeddingData(List<Double> embedding) {}

    private record ChatCompletionsRequest(String model, List<Map<String, String>> messages, double temperature) {}

    private record ChatCompletionsResponse(List<ChatChoice> choices) {}

    private record ChatChoice(ChatMessage message) {}

    private record ChatMessage(String role, String content) {}

    private void assertApiKeyConfigured() {
        String apiKey = appProperties.getOpenAi().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OpenAI API key is not configured");
        }
    }
}
