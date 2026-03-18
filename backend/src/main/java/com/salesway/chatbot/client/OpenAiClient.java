package com.salesway.chatbot.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper;

    public OpenAiClient(WebClient.Builder builder, AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
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

    public boolean hasHostedVectorStore() {
        String vectorStoreId = appProperties.getOpenAi().getVectorStoreId();
        return vectorStoreId != null && !vectorStoreId.isBlank();
    }

    public String getVectorStoreId() {
        return appProperties.getOpenAi().getVectorStoreId();
    }

    public int getVectorSearchMaxResults() {
        return Math.max(1, appProperties.getOpenAi().getVectorSearchMaxResults());
    }

    public List<String> searchVectorStore(String query, int maxResults) {
        assertApiKeyConfigured();
        assertVectorStoreConfigured();
        String rawResponse = webClient.post()
                .uri("/vector_stores/{vectorStoreId}/search", getVectorStoreId())
                .bodyValue(Map.of(
                        "query", query,
                        "max_num_results", Math.max(1, maxResults)
                ))
                .retrieve()
                .onStatus(HttpStatusCode::isError, resp -> resp.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .flatMap(body -> Mono.error(new IllegalStateException(
                                "OpenAI vector search failed: " + resp.statusCode() + " " + body))))
                .bodyToMono(String.class)
                .block();

        if (rawResponse == null || rawResponse.isBlank()) {
            throw new IllegalStateException("OpenAI vector search response was empty");
        }

        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode data = root.path("data");
            if (!data.isArray() || data.isEmpty()) {
                return List.of();
            }

            return java.util.stream.StreamSupport.stream(data.spliterator(), false)
                    .map(this::extractSearchSnippet)
                    .filter(snippet -> snippet != null && !snippet.isBlank())
                    .distinct()
                    .toList();
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse OpenAI vector search response", exception);
        }
    }

    private record EmbeddingsRequest(String model, String input) {}

    private record EmbeddingsResponse(List<EmbeddingData> data) {}

    private record EmbeddingData(List<Double> embedding) {}

    private record ChatCompletionsRequest(String model, List<Map<String, String>> messages, double temperature) {}

    private record ChatCompletionsResponse(List<ChatChoice> choices) {}

    private record ChatChoice(ChatMessage message) {}

    private record ChatMessage(String role, String content) {}

    private String extractSearchSnippet(JsonNode item) {
        JsonNode content = item.path("content");
        if (content.isArray()) {
            StringBuilder snippet = new StringBuilder();
            for (JsonNode part : content) {
                String text = extractTextNode(part);
                if (!text.isBlank()) {
                    if (snippet.length() > 0) {
                        snippet.append("\n");
                    }
                    snippet.append(text.trim());
                }
            }
            if (snippet.length() > 0) {
                return snippet.toString();
            }
        }

        String directText = extractTextNode(item);
        if (!directText.isBlank()) {
            return directText.trim();
        }
        return "";
    }

    private String extractTextNode(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return "";
        }
        if (node.has("text") && node.get("text").isTextual()) {
            return node.get("text").asText();
        }
        if (node.has("text") && node.get("text").has("value") && node.get("text").get("value").isTextual()) {
            return node.get("text").get("value").asText();
        }
        if (node.has("content") && node.get("content").isTextual()) {
            return node.get("content").asText();
        }
        return "";
    }

    private void assertApiKeyConfigured() {
        String apiKey = appProperties.getOpenAi().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OpenAI API key is not configured");
        }
    }

    private void assertVectorStoreConfigured() {
        if (!hasHostedVectorStore()) {
            throw new IllegalStateException("OpenAI vector store id is not configured");
        }
    }
}
