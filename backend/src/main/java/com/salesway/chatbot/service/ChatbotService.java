package com.salesway.chatbot.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.chatbot.client.OpenAiClient;
import com.salesway.chatbot.dto.ChatRequest;
import com.salesway.chatbot.dto.ChatResponse;
import com.salesway.chatbot.dto.IngestResponse;
import com.salesway.chatbot.entity.ChatConversation;
import com.salesway.chatbot.entity.ChatMessage;
import com.salesway.chatbot.entity.KbChunk;
import com.salesway.chatbot.entity.KbDocument;
import com.salesway.chatbot.repository.ChatConversationRepository;
import com.salesway.chatbot.repository.ChatMessageRepository;
import com.salesway.chatbot.repository.KbChunkRepository;
import com.salesway.chatbot.repository.KbDocumentRepository;
import com.salesway.common.enums.ChatRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.CustomUserDetails;
import jakarta.transaction.Transactional;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
public class ChatbotService {
    private static final int DEFAULT_CHUNK_SIZE = 1400;
    private static final int DEFAULT_CHUNK_OVERLAP = 300;
    private static final int DEFAULT_TOP_K = 10;
    private static final double DEFAULT_SIMILARITY_THRESHOLD = 0.75;

    private final OpenAiClient openAiClient;
    private final KbDocumentRepository kbDocumentRepository;
    private final KbChunkRepository kbChunkRepository;
    private final ChatConversationRepository chatConversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final ObjectMapper objectMapper;

    public ChatbotService(
            OpenAiClient openAiClient,
            KbDocumentRepository kbDocumentRepository,
            KbChunkRepository kbChunkRepository,
            ChatConversationRepository chatConversationRepository,
            ChatMessageRepository chatMessageRepository,
            CompanyMembershipRepository companyMembershipRepository,
            ObjectMapper objectMapper
    ) {
        this.openAiClient = openAiClient;
        this.kbDocumentRepository = kbDocumentRepository;
        this.kbChunkRepository = kbChunkRepository;
        this.chatConversationRepository = chatConversationRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public IngestResponse ingestPdf(MultipartFile file, String name, String version) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF file is required");
        }
        CompanyMembership membership = getMembership();

        String resolvedName = name == null || name.isBlank() ? "kb-document" : name.trim();
        String resolvedVersion = version == null || version.isBlank() ? "v1" : version.trim();
        String storageUri = "upload://" + file.getOriginalFilename();

        KbDocument document = kbDocumentRepository
                .findByCompanyIdAndNameAndVersion(membership.getCompany().getId(), resolvedName, resolvedVersion)
                .orElseGet(KbDocument::new);
        document.setCompany(membership.getCompany());
        document.setName(resolvedName);
        document.setVersion(resolvedVersion);
        document.setStorageUri(storageUri);
        document.setIsActive(true);
        document = kbDocumentRepository.save(document);

        kbChunkRepository.deleteByDocumentId(document.getId());
        kbChunkRepository.flush();

        String text = extractPdfText(file);
        List<String> chunks = chunkText(text, DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP);
        List<KbChunk> entities = new ArrayList<>();
        int index = 0;
        for (String chunk : chunks) {
            List<Double> embedding = openAiClient.embed(chunk);
            KbChunk kbChunk = new KbChunk();
            kbChunk.setDocument(document);
            kbChunk.setChunkIndex(index++);
            kbChunk.setContent(chunk);
            kbChunk.setEmbeddingText(toJson(embedding));
            entities.add(kbChunk);
        }
        kbChunkRepository.saveAll(entities);
        return new IngestResponse(document.getId(), entities.size());
    }

    @Transactional
    public ChatResponse chat(ChatRequest request) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message is required");
        }
        CompanyMembership membership = getMembership();
        KbDocument document = kbDocumentRepository
                .findFirstByCompanyIdAndIsActiveTrueOrderByCreatedAtDesc(membership.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No active knowledge base"));

        List<KbChunk> chunks = kbChunkRepository.findByDocumentIdOrderByChunkIndexAsc(document.getId());
        if (chunks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Knowledge base is empty");
        }

        List<Double> queryEmbedding = openAiClient.embed(request.getMessage());
        List<ScoredChunk> scoredChunks = chunks.stream()
                .filter(chunk -> chunk.getEmbeddingText() != null && !chunk.getEmbeddingText().isBlank())
                .map(chunk -> new ScoredChunk(
                        chunk,
                        cosineSimilarity(queryEmbedding, toVector(chunk.getEmbeddingText()))
                ))
                .sorted(Comparator.comparingDouble((ScoredChunk item) -> item.score).reversed())
                .limit(DEFAULT_TOP_K)
                .toList();

        double bestScore = scoredChunks.isEmpty() ? 0.0 : scoredChunks.get(0).score;
        boolean useContext = !isVagueMessage(request.getMessage()) && bestScore >= DEFAULT_SIMILARITY_THRESHOLD;

        String context = "";
        if (useContext) {
            context = scoredChunks.stream()
                    .map(item -> item.chunk.getContent())
                    .reduce("", (acc, item) -> acc.isEmpty() ? item : acc + "\n\n---\n\n" + item);
        }

        ChatConversation conversation = resolveConversation(membership, request.getConversationId());
        List<ChatMessage> recentMessages = chatMessageRepository
                .findTop10ByConversationIdOrderByCreatedAtDesc(conversation.getId())
                .stream()
                .sorted(Comparator.comparing(ChatMessage::getCreatedAt))
                .toList();

        List<java.util.Map<String, String>> messages = new ArrayList<>();
        String systemPrompt = "You are a helpful AI assistant. Always respond in English. "
                + "If the user message is vague or general, ask a short clarifying question before giving advice. "
                + "Only use the provided context for factual questions about the document. "
                + "If the answer is not in the context, say you don't have enough information from the document.";
        messages.add(java.util.Map.of("role", "system", "content", systemPrompt));

        for (ChatMessage msg : recentMessages) {
            String role = msg.getRole() == ChatRole.ASSISTANT ? "assistant" : "user";
            messages.add(java.util.Map.of("role", role, "content", msg.getContent()));
        }

        String userPrompt = useContext
                ? "Context:\n" + context + "\n\nQuestion:\n" + request.getMessage()
                : "Question:\n" + request.getMessage();
        messages.add(java.util.Map.of("role", "user", "content", userPrompt));

        String answer = openAiClient.chat(messages, 0.4);

        saveMessage(conversation, ChatRole.USER, request.getMessage(), null);
        saveMessage(conversation, ChatRole.ASSISTANT, answer, null);

        return new ChatResponse(answer, conversation.getId());
    }

    private ChatConversation resolveConversation(CompanyMembership membership, UUID conversationId) {
        if (conversationId != null) {
            return chatConversationRepository.findById(conversationId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
        }
        ChatConversation conversation = new ChatConversation();
        conversation.setCompany(membership.getCompany());
        conversation.setMembership(membership);
        conversation.setStartedAt(Instant.now());
        return chatConversationRepository.save(conversation);
    }

    private void saveMessage(ChatConversation conversation, ChatRole role, String content, String model) {
        ChatMessage message = new ChatMessage();
        message.setConversation(conversation);
        message.setRole(role);
        message.setContent(content);
        message.setModel(model);
        chatMessageRepository.save(message);
    }

    private CompanyMembership getMembership() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication");
        }
        return companyMembershipRepository
                .findFirstByUserIdAndStatusIn(userDetails.getUser().getId(), EnumSet.of(MembershipStatus.ACTIVE))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No eligible membership found"));
    }

    private String extractPdfText(MultipartFile file) {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return text == null ? "" : text.trim();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read PDF");
        }
    }

    private List<String> chunkText(String text, int chunkSize, int overlap) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String normalized = text.replace("\r", " ").replace("\n", " ").replaceAll("\\s+", " ").trim();
        List<String> chunks = new ArrayList<>();
        int start = 0;
        while (start < normalized.length()) {
            int end = Math.min(start + chunkSize, normalized.length());
            int adjustedEnd = end;
            if (end < normalized.length()) {
                int lastSpace = normalized.lastIndexOf(' ', end);
                if (lastSpace > start + 200) {
                    adjustedEnd = lastSpace;
                }
            }
            String chunk = normalized.substring(start, adjustedEnd).trim();
            if (!chunk.isBlank()) {
                chunks.add(chunk);
            }
            if (adjustedEnd >= normalized.length()) {
                break;
            }
            start = Math.max(0, adjustedEnd - overlap);
        }
        return chunks;
    }

    private String toJson(List<Double> embedding) {
        try {
            return objectMapper.writeValueAsString(embedding);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize embedding");
        }
    }

    private List<Double> toVector(String embeddingText) {
        try {
            return objectMapper.readValue(embeddingText, objectMapper.getTypeFactory().constructCollectionType(List.class, Double.class));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to parse embedding");
        }
    }

    private double cosineSimilarity(List<Double> a, List<Double> b) {
        if (a == null || b == null || a.isEmpty() || b.isEmpty() || a.size() != b.size()) {
            return 0.0;
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < a.size(); i++) {
            double av = a.get(i);
            double bv = b.get(i);
            dot += av * bv;
            normA += av * av;
            normB += bv * bv;
        }
        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private boolean isVagueMessage(String message) {
        if (message == null) {
            return true;
        }
        String trimmed = message.trim().toLowerCase();
        if (trimmed.length() < 12) {
            return true;
        }
        int wordCount = trimmed.split("\\s+").length;
        if (wordCount < 4) {
            return true;
        }
        return trimmed.matches(".*\\b(help|problem|issue|question|objection|objections|support|advice|info)\\b.*")
                && !trimmed.contains("?");
    }

    private record ScoredChunk(KbChunk chunk, double score) {}
}
