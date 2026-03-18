package com.salesway.leads.controller;

import com.salesway.leads.dto.LeadDetailResponse;
import com.salesway.leads.dto.LeadEventResponse;
import com.salesway.leads.dto.LeadListItemResponse;
import com.salesway.leads.dto.LeadActivityResponse;
import com.salesway.leads.dto.LeadAiInsightsResponse;
import com.salesway.leads.dto.LeadAiInsightFeedbackRequest;
import com.salesway.leads.dto.LeadAssigneeUpdateRequest;
import com.salesway.leads.dto.LeadAnswersUpdateRequest;
import com.salesway.leads.dto.LeadCallCreateRequest;
import com.salesway.leads.dto.LeadDetailAnswerItemResponse;
import com.salesway.leads.dto.LeadNoteRequest;
import com.salesway.leads.dto.LeadTaskCreateRequest;
import com.salesway.leads.dto.LeadFormResponse;
import com.salesway.leads.dto.LeadStageUpdateRequest;
import com.salesway.leads.dto.LeadStatusUpdateRequest;
import com.salesway.leads.service.LeadDetailsService;
import com.salesway.tasks.dto.TaskBoardResponse;
import com.salesway.leads.service.LeadManagementService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/manager/leads")
public class LeadManagementController {
    private final LeadManagementService leadManagementService;
    private final LeadDetailsService leadDetailsService;

    public LeadManagementController(
            LeadManagementService leadManagementService,
            LeadDetailsService leadDetailsService
    ) {
        this.leadManagementService = leadManagementService;
        this.leadDetailsService = leadDetailsService;
    }

    @GetMapping
    public ResponseEntity<Page<LeadListItemResponse>> list(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "createdFrom", required = false) String createdFrom,
            @RequestParam(name = "createdTo", required = false) String createdTo,
            @RequestParam(name = "assignedTo", required = false) String assignedTo,
            @RequestParam(name = "hasOpenTasks", required = false) Boolean hasOpenTasks,
            @RequestParam(name = "source", required = false) String source,
            @RequestParam(name = "sort", required = false) String sort
    ) {
        return ResponseEntity.ok(leadManagementService.listLeads(
                status,
                page,
                size,
                q,
                createdFrom,
                createdTo,
                assignedTo,
                hasOpenTasks,
                source,
                sort
        ));
    }

    @GetMapping("/{leadId}")
    public ResponseEntity<LeadDetailResponse> getDetail(@PathVariable("leadId") UUID leadId) {
        return ResponseEntity.ok(leadManagementService.getLead(leadId));
    }

    @GetMapping("/{leadId}/answers")
    public ResponseEntity<List<LeadDetailAnswerItemResponse>> getAnswers(@PathVariable("leadId") UUID leadId) {
        return ResponseEntity.ok(leadDetailsService.getAnswers(leadId));
    }

    @PutMapping("/{leadId}/answers")
    public ResponseEntity<List<LeadDetailAnswerItemResponse>> updateAnswers(
            @PathVariable("leadId") UUID leadId,
            @Valid @RequestBody LeadAnswersUpdateRequest request
    ) {
        return ResponseEntity.ok(leadDetailsService.updateAnswers(leadId, request));
    }

    @GetMapping("/{leadId}/form")
    public ResponseEntity<LeadFormResponse> getLeadForm(@PathVariable("leadId") UUID leadId) {
        return ResponseEntity.ok(leadDetailsService.getLeadForm(leadId));
    }

    @PatchMapping("/{leadId}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable("leadId") UUID leadId,
            @Valid @RequestBody LeadStatusUpdateRequest request
    ) {
        leadManagementService.updateStatus(leadId, request.getStatus());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{leadId}/assignee")
    public ResponseEntity<Void> updateAssignee(
            @PathVariable("leadId") UUID leadId,
            @RequestBody LeadAssigneeUpdateRequest request
    ) {
        leadManagementService.updateAssignee(leadId, request.getAssignedToUserId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{leadId}/stage")
    public ResponseEntity<Void> updateStage(
            @PathVariable("leadId") UUID leadId,
            @RequestBody LeadStageUpdateRequest request
    ) {
        leadManagementService.updateStage(leadId, request.getStageId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{leadId}/events")
    public ResponseEntity<Page<LeadEventResponse>> getEvents(
            @PathVariable("leadId") UUID leadId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "types", required = false) String types
    ) {
        return ResponseEntity.ok(leadManagementService.getEvents(leadId, page, size, types));
    }

    @PostMapping("/{leadId}/notes")
    public ResponseEntity<Void> addNote(
            @PathVariable("leadId") UUID leadId,
            @Valid @RequestBody LeadNoteRequest request
    ) {
        leadManagementService.addNote(leadId, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{leadId}/activities")
    public ResponseEntity<Page<LeadActivityResponse>> getActivities(
            @PathVariable("leadId") UUID leadId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(leadDetailsService.getActivities(leadId, page, size));
    }

    @PostMapping("/{leadId}/calls")
    public ResponseEntity<LeadActivityResponse> addCall(
            @PathVariable("leadId") UUID leadId,
            @Valid @RequestBody LeadCallCreateRequest request
    ) {
        return ResponseEntity.ok(leadDetailsService.addCall(leadId, request));
    }

    @PostMapping("/{leadId}/tasks")
    public ResponseEntity<LeadActivityResponse> addTask(
            @PathVariable("leadId") UUID leadId,
            @Valid @RequestBody LeadTaskCreateRequest request
    ) {
        return ResponseEntity.ok(leadDetailsService.addTask(leadId, request));
    }

    @GetMapping("/{leadId}/tasks")
    public ResponseEntity<List<TaskBoardResponse>> getLeadTasks(@PathVariable("leadId") UUID leadId) {
        return ResponseEntity.ok(leadManagementService.getLeadTasks(leadId));
    }

    @GetMapping("/{leadId}/ai-insights")
    public ResponseEntity<LeadAiInsightsResponse> getAiInsights(@PathVariable("leadId") UUID leadId) {
        return ResponseEntity.ok(leadDetailsService.getAiInsights(leadId));
    }

    @PostMapping("/{leadId}/ai-insights/regenerate")
    public ResponseEntity<LeadAiInsightsResponse> regenerateAiInsights(@PathVariable("leadId") UUID leadId) {
        return ResponseEntity.ok(leadDetailsService.regenerateAiInsights(leadId));
    }

    @PatchMapping("/{leadId}/ai-insights/{insightId}/feedback")
    public ResponseEntity<Void> updateAiInsightFeedback(
            @PathVariable("leadId") UUID leadId,
            @PathVariable("insightId") UUID insightId,
            @Valid @RequestBody LeadAiInsightFeedbackRequest request
    ) {
        leadDetailsService.updateInsightFeedback(leadId, insightId, request);
        return ResponseEntity.noContent().build();
    }
}
