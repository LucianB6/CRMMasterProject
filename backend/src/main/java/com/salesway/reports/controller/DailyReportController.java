package com.salesway.reports.controller;

import com.salesway.reports.dto.DailyReportInputsRequest;
import com.salesway.reports.dto.DailyReportResponse;
import com.salesway.reports.dto.DailyReportSummaryResponse;
import com.salesway.reports.service.DailyReportService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

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

    @GetMapping("/{date}")
    public ResponseEntity<DailyReportResponse> getReportByDate(
            @PathVariable("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(dailyReportService.getReport(date));
    }

    @GetMapping
    public ResponseEntity<List<DailyReportResponse>> getReportsInRange(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(dailyReportService.getReportsInRange(from, to));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<DailyReportResponse>> getRecentReports(
            @RequestParam(value = "days", defaultValue = "7") int days
    ) {
        return ResponseEntity.ok(dailyReportService.getRecentReports(days));
    }

    @GetMapping("/current-month")
    public ResponseEntity<List<DailyReportResponse>> getCurrentMonthReports() {
        return ResponseEntity.ok(dailyReportService.getCurrentMonthReports());
    }

    @GetMapping("/summary")
    public ResponseEntity<DailyReportSummaryResponse> getSummary(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (from == null && to == null) {
            return ResponseEntity.ok(dailyReportService.getSummary(today.withDayOfMonth(1), today));
        }
        return ResponseEntity.ok(dailyReportService.getSummary(from, to));
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
