package com.salesway.manager.controller;

import com.salesway.manager.dto.ManagerDailyReportResponse;
import com.salesway.manager.dto.ManagerDailyReportUpdateRequest;
import com.salesway.manager.service.ManagerReportService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/manager/reports")
public class ManagerReportController {
    private final ManagerReportService managerReportService;

    public ManagerReportController(ManagerReportService managerReportService) {
        this.managerReportService = managerReportService;
    }

    @GetMapping
    public ResponseEntity<List<ManagerDailyReportResponse>> getReports(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "agent_membership_id", required = false) UUID agentMembershipId
    ) {
        return ResponseEntity.ok(managerReportService.getReports(from, to, agentMembershipId));
    }

    @PutMapping("/{reportId}")
    public ResponseEntity<ManagerDailyReportResponse> updateReport(
            @PathVariable("reportId") UUID reportId,
            @Valid @RequestBody ManagerDailyReportUpdateRequest request
    ) {
        return ResponseEntity.ok(managerReportService.updateReport(reportId, request));
    }
}
