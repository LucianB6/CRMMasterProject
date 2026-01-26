package com.salesway.chatbot.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class ChatResponse {
    @JsonProperty("answer")
    private final String answer;

    @JsonProperty("conversation_id")
    private final UUID conversationId;

    public ChatResponse(String answer, UUID conversationId) {
        this.answer = answer;
        this.conversationId = conversationId;
    }

    public String getAnswer() {
        return answer;
    }

    public UUID getConversationId() {
        return conversationId;
    }
}
