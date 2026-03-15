package com.salesway.manager.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.manager.dto.ManagerNotificationResponse;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.notifications.entity.Notification;
import com.salesway.notifications.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class ManagerNotificationService {
    private final ManagerAccessService managerAccessService;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public ManagerNotificationService(
            ManagerAccessService managerAccessService,
            NotificationRepository notificationRepository,
            ObjectMapper objectMapper
    ) {
        this.managerAccessService = managerAccessService;
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ManagerNotificationResponse> getRecentNotifications(int limit) {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        List<Notification> notifications = notificationRepository.findByRecipientMembershipIdOrderByCreatedAtDesc(
                manager.getId()
        );

        return notifications.stream()
                .limit(limit)
                .map(notification -> new ManagerNotificationResponse(
                        notification.getId(),
                        notification.getType(),
                        notification.getStatus(),
                        notification.getCreatedAt(),
                        notification.getScheduledFor(),
                        parsePayload(notification.getPayloadJsonText())
                ))
                .toList();
    }

    @Transactional
    public void deleteNotification(java.util.UUID notificationId) {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        boolean exists = notificationRepository.existsByIdAndRecipientMembershipId(notificationId, manager.getId());
        if (!exists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found");
        }
        notificationRepository.deleteByIdAndRecipientMembershipId(notificationId, manager.getId());
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<>() {});
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }
}
