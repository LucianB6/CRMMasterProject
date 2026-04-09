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
public class LeadAiInsightsWorker {
    private static final Logger LOG = LoggerFactory.getLogger(LeadAiInsightsWorker.class);

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private final LeadAiInsightsAsyncService leadAiInsightsAsyncService;
    private final boolean enabled;

    public LeadAiInsightsWorker(
            RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper,
            LeadAiInsightsAsyncService leadAiInsightsAsyncService,
            @Value("${app.leads.ai-insights-worker-enabled:true}") boolean enabled
    ) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.leadAiInsightsAsyncService = leadAiInsightsAsyncService;
        this.enabled = enabled;
    }

    @Scheduled(fixedDelayString = "${app.leads.ai-insights-worker-fixed-delay-ms:5000}")
    public void consumeQueue() {
        if (!enabled) {
            return;
        }
        while (true) {
            Object payload = redisTemplate.opsForList().rightPop(LeadAiInsightsQueueService.LEAD_AI_INSIGHTS_QUEUE_KEY);
            if (payload == null) {
                return;
            }
            try {
                LeadAiInsightsQueueService.LeadAiInsightsJob job = objectMapper.readValue(
                        payload.toString(),
                        LeadAiInsightsQueueService.LeadAiInsightsJob.class
                );
                UUID leadId = job.leadId();
                if (leadId != null) {
                    LOG.info("AI insights worker dequeued leadId={} jobId={} enqueuedAt={}", leadId, job.jobId(), job.enqueuedAt());
                    leadAiInsightsAsyncService.processQueuedRegeneration(leadId, job.jobId());
                }
            } catch (Exception exception) {
                LOG.error("AI insights worker failed to process payload={}", payload, exception);
            }
        }
    }
}
