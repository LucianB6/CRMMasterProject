package com.salesway.leads.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class LeadScoringQueueService {
    public static final String LEAD_SCORE_QUEUE_KEY = "lead-score-queue";

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public LeadScoringQueueService(RedisTemplate<String, Object> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void enqueueLeadScoring(UUID leadId) {
        try {
            String payload = objectMapper.writeValueAsString(new LeadScoringJob(leadId));
            redisTemplate.opsForList().leftPush(LEAD_SCORE_QUEUE_KEY, payload);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to enqueue lead scoring job", exception);
        }
    }

    public record LeadScoringJob(UUID leadId) {
    }
}
