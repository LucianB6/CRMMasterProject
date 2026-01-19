package com.salesway.manager.controller;

import com.salesway.manager.dto.ManagerAgentCreateRequest;
import com.salesway.manager.dto.ManagerAgentCreateResponse;
import com.salesway.manager.service.ManagerTeamService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
