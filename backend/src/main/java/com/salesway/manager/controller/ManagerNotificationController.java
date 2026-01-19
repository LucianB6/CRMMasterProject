package com.salesway.manager.controller;

import com.salesway.manager.dto.ManagerNotificationResponse;
import com.salesway.manager.service.ManagerNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/manager/notifications")
public class ManagerNotificationController {
    private final ManagerNotificationService managerNotificationService;

    public ManagerNotificationController(ManagerNotificationService managerNotificationService) {
        this.managerNotificationService = managerNotificationService;
    }

    @GetMapping
    public ResponseEntity<List<ManagerNotificationResponse>> getNotifications(
            @RequestParam(value = "limit", defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(managerNotificationService.getRecentNotifications(limit));
    }
}
