package com.salesway.leads.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class LeadScoringWorker {
    private static final Logger LOG = LoggerFactory.getLogger(LeadScoringWorker.class);

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private final LeadAsyncScoringService leadAsyncScoringService;
    private final boolean enabled;

    public LeadScoringWorker(
            RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper,
            LeadAsyncScoringService leadAsyncScoringService,
            @Value("${app.leads.ai-worker-enabled:true}") boolean enabled
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.leadAsyncScoringService = leadAsyncScoringService;
        this.enabled = enabled;
    }

    @Scheduled(fixedDelayString = "${app.leads.ai-worker-fixed-delay-ms:5000}")
    public void consumeLeadScoringQueue() {
        if (!enabled) {
            return;
        }
        while (true) {
            Object payload = redisTemplate.opsForList().rightPop(LeadScoringQueueService.LEAD_SCORE_QUEUE_KEY);
            if (payload == null) {
                return;
            }
            try {
                LeadScoringQueueService.LeadScoringJob job = objectMapper.readValue(payload.toString(), LeadScoringQueueService.LeadScoringJob.class);
                UUID leadId = job.leadId();
                if (leadId != null) {
                    leadAsyncScoringService.processQueuedLead(leadId);
                }
            } catch (Exception exception) {
                LOG.error("Lead scoring queue worker failed to process payload={}", payload, exception);
            }
        }
    }
}
