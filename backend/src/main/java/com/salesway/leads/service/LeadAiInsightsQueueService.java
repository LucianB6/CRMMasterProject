package com.salesway.leads.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class LeadAiInsightsQueueService {
    public static final String LEAD_AI_INSIGHTS_QUEUE_KEY = "lead-ai-insights-regenerate-queue";

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public LeadAiInsightsQueueService(RedisTemplate<String, Object> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void enqueueRegeneration(UUID leadId) {
        try {
            String payload = objectMapper.writeValueAsString(new LeadAiInsightsJob(leadId));
            redisTemplate.opsForList().leftPush(LEAD_AI_INSIGHTS_QUEUE_KEY, payload);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to enqueue AI insights regeneration job", exception);
        }
    }

    public record LeadAiInsightsJob(UUID leadId) {
    }
}
