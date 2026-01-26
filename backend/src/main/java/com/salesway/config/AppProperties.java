package com.salesway.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.ArrayList;
import java.util.List;

@Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private final Prediction prediction = new Prediction();
    private final Cors cors = new Cors();
    private final OpenAi openAi = new OpenAi();

    public Prediction getPrediction() {
        return prediction;
    }

    public Cors getCors() {
        return cors;
    }

    public OpenAi getOpenAi() {
        return openAi;
    }

    public static class Prediction {
        @NotBlank
        private String baseUrl;
        private String apiKey;
        private String apiKeyHeader = "X-API-Key";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getApiKeyHeader() {
            return apiKeyHeader;
        }

        public void setApiKeyHeader(String apiKeyHeader) {
            this.apiKeyHeader = apiKeyHeader;
        }
    }

    public static class Cors {
        @NotEmpty
        private List<String> allowedOrigins = new ArrayList<>();

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class OpenAi {
        private String apiKey;
        private String baseUrl = "https://api.openai.com/v1";
        private String chatModel = "gpt-4o-mini";
        private String embeddingModel = "text-embedding-3-small";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getChatModel() {
            return chatModel;
        }

        public void setChatModel(String chatModel) {
            this.chatModel = chatModel;
        }

        public String getEmbeddingModel() {
            return embeddingModel;
        }

        public void setEmbeddingModel(String embeddingModel) {
            this.embeddingModel = embeddingModel;
        }
    }
}
