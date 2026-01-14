package com.salesway.chatbot.repository;

import com.salesway.chatbot.entity.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {
}
