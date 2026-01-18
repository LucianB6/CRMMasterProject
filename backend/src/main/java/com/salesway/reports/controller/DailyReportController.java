package com.salesway.reports.controller;

import com.salesway.reports.dto.DailyReportInputsRequest;
import com.salesway.reports.dto.DailyReportResponse;
import com.salesway.reports.service.DailyReportService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports/daily")
public class DailyReportController {
    private final DailyReportService dailyReportService;

    public DailyReportController(DailyReportService dailyReportService) {
        this.dailyReportService = dailyReportService;
    }

    @GetMapping("/today")
    public ResponseEntity<DailyReportResponse> getTodayReport() {
        return ResponseEntity.ok(dailyReportService.getTodayReport());
    }

    @PostMapping("/draft")
    public ResponseEntity<DailyReportResponse> saveDraft(@Valid @RequestBody DailyReportInputsRequest request) {
        return ResponseEntity.ok(dailyReportService.saveDraft(request));
    }

    @PostMapping("/submit")
    public ResponseEntity<DailyReportResponse> submitReport(@Valid @RequestBody DailyReportInputsRequest request) {
        return ResponseEntity.ok(dailyReportService.submitReport(request));
    }
}
