package com.salesway.analytics.controller;

import com.salesway.analytics.dto.PageViewTrackRequest;
import com.salesway.analytics.dto.PageViewTrackResponse;
import com.salesway.analytics.service.PageViewTrackingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {
    private final PageViewTrackingService pageViewTrackingService;

    public AnalyticsController(PageViewTrackingService pageViewTrackingService) {
        this.pageViewTrackingService = pageViewTrackingService;
    }

    @PostMapping("/page-view")
    public ResponseEntity<PageViewTrackResponse> trackPageView(
            @Valid @RequestBody PageViewTrackRequest request
    ) {
        return ResponseEntity.ok(pageViewTrackingService.track(request));
    }
}
