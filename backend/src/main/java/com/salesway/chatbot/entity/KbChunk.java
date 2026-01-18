package com.salesway.chatbot.entity;

import com.salesway.common.auditing.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "kb_chunks",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_kb_chunks_doc_index", columnNames = {"document_id", "chunk_index"})
        },
        indexes = {
                @Index(name = "idx_kb_chunks_doc", columnList = "document_id")
        })
public class KbChunk extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private KbDocument document;

    @NotNull
    @Min(0)
    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    @NotBlank
    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "embedding", columnDefinition = "text")
    private String embeddingText;

    public KbDocument getDocument() {
        return document;
    }

    public void setDocument(KbDocument document) {
        this.document = document;
    }

    public Integer getChunkIndex() {
        return chunkIndex;
    }

    public void setChunkIndex(Integer chunkIndex) {
        this.chunkIndex = chunkIndex;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getEmbeddingText() {
        return embeddingText;
    }

    public void setEmbeddingText(String embeddingText) {
        this.embeddingText = embeddingText;
    }
}
