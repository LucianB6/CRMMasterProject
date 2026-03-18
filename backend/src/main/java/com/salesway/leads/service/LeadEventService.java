package com.salesway.leads.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.leads.dto.LeadEventResponse;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.entity.LeadEvent;
import com.salesway.leads.enums.LeadEventType;
import com.salesway.leads.repository.LeadEventRepository;
import com.salesway.security.AuthenticatedUserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;

@Service
public class LeadEventService {
    private final LeadEventRepository leadEventRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final ObjectMapper objectMapper;

    public LeadEventService(
            LeadEventRepository leadEventRepository,
            AuthenticatedUserService authenticatedUserService,
            ObjectMapper objectMapper
    ) {
        this.leadEventRepository = leadEventRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void appendEvent(Lead lead, LeadEventType type, String summary, Map<String, Object> payload) {
        appendEvent(lead, type, summary, payload, authenticatedUserService.requireCurrentUserId());
    }

    @Transactional
    public void appendSystemEvent(Lead lead, LeadEventType type, String summary, Map<String, Object> payload) {
        appendEvent(lead, type, summary, payload, null);
    }

    @Transactional(readOnly = true)
    public Page<LeadEventResponse> getEvents(
            UUID companyId,
            UUID leadId,
            Pageable pageable,
            Collection<LeadEventType> types
    ) {
        Page<LeadEvent> page = (types == null || types.isEmpty())
                ? leadEventRepository.findByCompanyIdAndLeadIdOrderByCreatedAtDesc(companyId, leadId, pageable)
                : leadEventRepository.findByCompanyIdAndLeadIdAndTypeInOrderByCreatedAtDesc(companyId, leadId, types, pageable);
        return page.map(this::toResponse);
    }

    private void appendEvent(
            Lead lead,
            LeadEventType type,
            String summary,
            Map<String, Object> payload,
            UUID actorUserId
    ) {
        LeadEvent event = new LeadEvent();
        event.setLead(lead);
        event.setCompany(lead.getCompany());
        event.setType(type);
        event.setSummary(summary);
        event.setActorUserId(actorUserId);
        JsonNode payloadNode = payload == null ? null : objectMapper.valueToTree(payload);
        event.setPayload(payloadNode);
        leadEventRepository.save(event);
        lead.setLastActivityAt(Instant.now());
    }

    private LeadEventResponse toResponse(LeadEvent event) {
        return new LeadEventResponse(
                event.getId(),
                event.getType(),
                event.getCreatedAt(),
                event.getActorUserId(),
                event.getPayload(),
                event.getSummary()
        );
    }
}
