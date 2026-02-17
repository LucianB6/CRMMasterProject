package com.salesway.leads.controller;

import com.salesway.leads.dto.LeadDetailResponse;
import com.salesway.leads.dto.LeadListItemResponse;
import com.salesway.leads.dto.LeadStatusUpdateRequest;
import com.salesway.leads.service.LeadManagementService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/manager/leads")
public class LeadManagementController {
    private final LeadManagementService leadManagementService;

    public LeadManagementController(LeadManagementService leadManagementService) {
        this.leadManagementService = leadManagementService;
    }

    @GetMapping
    public ResponseEntity<Page<LeadListItemResponse>> list(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(leadManagementService.listLeads(status, page, size));
    }

    @GetMapping("/{leadId}")
    public ResponseEntity<LeadDetailResponse> getDetail(@PathVariable("leadId") UUID leadId) {
        return ResponseEntity.ok(leadManagementService.getLead(leadId));
    }

    @PatchMapping("/{leadId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable("leadId") UUID leadId,
            @Valid @RequestBody LeadStatusUpdateRequest request
    ) {
        leadManagementService.updateStatus(leadId, request.getStatus());
        return ResponseEntity.noContent().build();
    }
}
