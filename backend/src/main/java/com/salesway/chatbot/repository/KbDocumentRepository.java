package com.salesway.chatbot.repository;

import com.salesway.chatbot.entity.KbDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface KbDocumentRepository extends JpaRepository<KbDocument, UUID> {
}
