package com.salesway.chatbot.repository;

import com.salesway.chatbot.entity.KbChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface KbChunkRepository extends JpaRepository<KbChunk, UUID> {
    List<KbChunk> findByDocumentIdOrderByChunkIndexAsc(UUID documentId);

    long deleteByDocumentId(UUID documentId);
}
