package com.salesway.chatbot.repository;

import com.salesway.chatbot.entity.KbDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface KbDocumentRepository extends JpaRepository<KbDocument, UUID> {
    Optional<KbDocument> findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(UUID companyId);

    Optional<KbDocument> findByCompanyIdAndNameAndVersion(UUID companyId, String name, String version);
}
