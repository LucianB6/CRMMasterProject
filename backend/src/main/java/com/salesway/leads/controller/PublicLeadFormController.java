package com.salesway.leads.controller;

import com.salesway.leads.dto.LeadFormResponse;
import com.salesway.leads.dto.PublicLeadSubmitRequest;
import com.salesway.leads.dto.PublicLeadSubmitResponse;
import com.salesway.leads.service.LeadCaptureService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/lead-form")
public class PublicLeadFormController {
    private final LeadCaptureService leadCaptureService;

    public PublicLeadFormController(LeadCaptureService leadCaptureService) {
        this.leadCaptureService = leadCaptureService;
    }

    @GetMapping("/{publicSlug}")
    public ResponseEntity<LeadFormResponse> getPublicForm(@PathVariable("publicSlug") String publicSlug) {
        return ResponseEntity.ok(leadCaptureService.getPublicForm(publicSlug));
    }

    @PostMapping("/{publicSlug}/submit")
    public ResponseEntity<PublicLeadSubmitResponse> submit(
            @PathVariable("publicSlug") String publicSlug,
            @Valid @RequestBody PublicLeadSubmitRequest request
    ) {
        return ResponseEntity.ok(leadCaptureService.submitLead(publicSlug, request));
    }
}
