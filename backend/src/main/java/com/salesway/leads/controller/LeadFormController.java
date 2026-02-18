package com.salesway.leads.controller;

import com.salesway.leads.dto.LeadFormResponse;
import com.salesway.leads.dto.LeadFormUpdateRequest;
import com.salesway.leads.dto.LeadQuestionReorderRequest;
import com.salesway.leads.dto.LeadQuestionRequest;
import com.salesway.leads.dto.LeadQuestionResponse;
import com.salesway.leads.service.LeadFormService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/manager/lead-form")
public class LeadFormController {
    private final LeadFormService leadFormService;

    public LeadFormController(LeadFormService leadFormService) {
        this.leadFormService = leadFormService;
    }

    @GetMapping
    public ResponseEntity<LeadFormResponse> getLeadForm() {
        return ResponseEntity.ok(leadFormService.getManagerForm());
    }

    @PutMapping
    public ResponseEntity<LeadFormResponse> upsertLeadForm(@Valid @RequestBody LeadFormUpdateRequest request) {
        return ResponseEntity.ok(leadFormService.upsertForm(request));
    }

    @PostMapping("/questions")
    public ResponseEntity<LeadQuestionResponse> addQuestion(@Valid @RequestBody LeadQuestionRequest request) {
        return ResponseEntity.ok(leadFormService.addQuestion(request));
    }

    @PatchMapping("/questions/{questionId}")
    public ResponseEntity<LeadQuestionResponse> updateQuestion(
            @PathVariable("questionId") UUID questionId,
            @Valid @RequestBody LeadQuestionRequest request
    ) {
        return ResponseEntity.ok(leadFormService.updateQuestion(questionId, request));
    }

    @PatchMapping("/questions/reorder")
    public ResponseEntity<Void> reorderQuestions(@Valid @RequestBody LeadQuestionReorderRequest request) {
        leadFormService.reorderQuestions(request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/questions/{questionId}")
    public ResponseEntity<Void> deactivateQuestion(@PathVariable("questionId") UUID questionId) {
        leadFormService.deactivateQuestion(questionId);
        return ResponseEntity.noContent().build();
    }
}
