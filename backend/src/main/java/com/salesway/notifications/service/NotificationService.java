package com.salesway.notifications.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.common.enums.NotificationStatus;
import com.salesway.common.enums.NotificationType;
import com.salesway.companies.entity.Company;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.notifications.entity.Notification;
import com.salesway.notifications.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@Service
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public NotificationService(NotificationRepository notificationRepository, ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
    }

    public Notification createNotification(
            Company company,
            CompanyMembership recipient,
            NotificationType type,
            Map<String, Object> payload,
            Instant scheduledFor
    ) {
        Notification notification = new Notification();
        notification.setCompany(company);
        notification.setRecipientMembership(recipient);
        notification.setType(type);
        notification.setStatus(NotificationStatus.PENDING);
        notification.setScheduledFor(scheduledFor);
        notification.setPayloadJsonText(toJson(payload));
        return notificationRepository.save(notification);
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize notification payload");
        }
    }
}
