package com.salesway.manager.controller;

import com.salesway.manager.dto.ManagerInviteCreateRequest;
import com.salesway.manager.dto.ManagerInviteCreateResponse;
import com.salesway.manager.service.ManagerInvitationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/manager/invitations")
public class ManagerInvitationController {
    private final ManagerInvitationService managerInvitationService;

    public ManagerInvitationController(ManagerInvitationService managerInvitationService) {
        this.managerInvitationService = managerInvitationService;
    }

    @PostMapping
    public ResponseEntity<ManagerInviteCreateResponse> createInvite(@Valid @RequestBody ManagerInviteCreateRequest request) {
        return ResponseEntity.ok(managerInvitationService.createInvite(request.getEmail()));
    }
}
