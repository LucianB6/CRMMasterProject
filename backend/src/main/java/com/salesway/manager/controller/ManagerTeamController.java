package com.salesway.manager.controller;

import com.salesway.manager.dto.ManagerAgentCreateRequest;
import com.salesway.manager.dto.ManagerAgentCreateResponse;
import com.salesway.manager.service.ManagerTeamService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/manager/agents")
public class ManagerTeamController {
    private final ManagerTeamService managerTeamService;

    public ManagerTeamController(ManagerTeamService managerTeamService) {
        this.managerTeamService = managerTeamService;
    }

    @PostMapping
    public ResponseEntity<ManagerAgentCreateResponse> createAgent(
            @Valid @RequestBody ManagerAgentCreateRequest request
    ) {
        return ResponseEntity.ok(managerTeamService.createAgent(request));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteAgent(@PathVariable("userId") UUID userId) {
        managerTeamService.deleteAgent(userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{userId}/deactivate")
    public ResponseEntity<Void> deactivateAgent(@PathVariable("userId") UUID userId) {
        managerTeamService.deactivateAgent(userId);
        return ResponseEntity.noContent().build();
    }
}
