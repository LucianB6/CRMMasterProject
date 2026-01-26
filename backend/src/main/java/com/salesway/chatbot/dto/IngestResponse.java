package com.salesway.chatbot.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.UUID;

public class IngestResponse {
    @JsonProperty("document_id")
    private final UUID documentId;

    @JsonProperty("chunks")
    private final int chunks;

    public IngestResponse(UUID documentId, int chunks) {
        this.documentId = documentId;
        this.chunks = chunks;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public int getChunks() {
        return chunks;
    }
}
