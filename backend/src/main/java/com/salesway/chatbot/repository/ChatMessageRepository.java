package com.salesway.chatbot.repository;

import com.salesway.chatbot.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findTop10ByConversationIdOrderByCreatedAtDesc(UUID conversationId);
}
