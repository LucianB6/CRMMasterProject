package com.salesway.leads.controller;

import com.salesway.leads.dto.PipelineStageReorderRequest;
import com.salesway.leads.dto.PipelineStageRequest;
import com.salesway.leads.dto.PipelineStageResponse;
import com.salesway.leads.service.PipelineStageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/manager/pipeline-stages")
public class PipelineStageController {
    private final PipelineStageService pipelineStageService;

    public PipelineStageController(PipelineStageService pipelineStageService) {
        this.pipelineStageService = pipelineStageService;
    }

    @GetMapping
    public ResponseEntity<List<PipelineStageResponse>> list(
            @RequestParam(name = "activeOnly", defaultValue = "false") boolean activeOnly
    ) {
        return ResponseEntity.ok(pipelineStageService.listStages(activeOnly));
    }

    @PostMapping
    public ResponseEntity<PipelineStageResponse> create(@Valid @RequestBody PipelineStageRequest request) {
        return ResponseEntity.ok(pipelineStageService.createStage(request));
    }

    @PatchMapping("/{stageId}")
    public ResponseEntity<PipelineStageResponse> update(
            @PathVariable("stageId") UUID stageId,
            @Valid @RequestBody PipelineStageRequest request
    ) {
        return ResponseEntity.ok(pipelineStageService.updateStage(stageId, request));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<Void> reorder(@Valid @RequestBody PipelineStageReorderRequest request) {
        pipelineStageService.reorderStages(request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{stageId}")
    public ResponseEntity<Void> delete(@PathVariable("stageId") UUID stageId) {
        pipelineStageService.deleteStage(stageId);
        return ResponseEntity.noContent().build();
    }
}
