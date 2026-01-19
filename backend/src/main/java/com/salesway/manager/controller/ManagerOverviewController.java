package com.salesway.manager.controller;

import com.salesway.manager.dto.ManagerAgentResponse;
import com.salesway.manager.dto.ManagerTeamPerformancePointResponse;
import com.salesway.manager.service.ManagerOverviewService;
import com.salesway.reports.dto.DailyReportSummaryResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/manager/overview")
public class ManagerOverviewController {
    private final ManagerOverviewService managerOverviewService;

    public ManagerOverviewController(ManagerOverviewService managerOverviewService) {
        this.managerOverviewService = managerOverviewService;
    }

    @GetMapping("/summary")
    public ResponseEntity<DailyReportSummaryResponse> getTeamSummary(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (from == null && to == null) {
            return ResponseEntity.ok(managerOverviewService.getTeamSummary(today.withDayOfMonth(1), today));
        }
        return ResponseEntity.ok(managerOverviewService.getTeamSummary(from, to));
    }

    @GetMapping("/agents")
    public ResponseEntity<List<ManagerAgentResponse>> getAgents() {
        return ResponseEntity.ok(managerOverviewService.getAgents());
    }

    @GetMapping("/agents/{agentMembershipId}/summary")
    public ResponseEntity<DailyReportSummaryResponse> getAgentSummary(
            @PathVariable("agentMembershipId") UUID agentMembershipId,
            @RequestParam(value = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(managerOverviewService.getAgentSummary(agentMembershipId, from, to));
    }

    @GetMapping("/team-performance")
    public ResponseEntity<List<ManagerTeamPerformancePointResponse>> getTeamPerformance(
            @RequestParam(value = "from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(managerOverviewService.getTeamPerformance(from, to));
    }
}
