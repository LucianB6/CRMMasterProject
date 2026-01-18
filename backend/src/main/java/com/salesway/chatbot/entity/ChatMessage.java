package com.salesway.chatbot.entity;

import com.salesway.common.auditing.CreatedOnlyEntity;
import com.salesway.common.enums.ChatRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "chat_messages",
        indexes = {
                @Index(name = "idx_chat_msg_conv_created", columnList = "conversation_id, created_at")
        })
public class ChatMessage extends CreatedOnlyEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private ChatConversation conversation;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private ChatRole role;

    @NotBlank
    @Column(name = "content", nullable = false, columnDefinition = "text")
    private String content;

    @Size(max = 255)
    @Column(name = "model")
    private String model;

    @Column(name = "sources_json", columnDefinition = "text")
    private String sourcesJsonText;

    public ChatConversation getConversation() {
        return conversation;
    }

    public void setConversation(ChatConversation conversation) {
        this.conversation = conversation;
    }

    public ChatRole getRole() {
        return role;
    }

    public void setRole(ChatRole role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getSourcesJsonText() {
        return sourcesJsonText;
    }

    public void setSourcesJsonText(String sourcesJsonText) {
        this.sourcesJsonText = sourcesJsonText;
    }
}
