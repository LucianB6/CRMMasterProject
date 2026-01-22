package com.salesway.calendar.controller;

import com.salesway.calendar.dto.CalendarEventRequest;
import com.salesway.calendar.dto.CalendarEventResponse;
import com.salesway.calendar.service.CalendarEventService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/calendar/events", "/api/calendar/events"})
public class CalendarEventController {
    private final CalendarEventService calendarEventService;

    public CalendarEventController(CalendarEventService calendarEventService) {
        this.calendarEventService = calendarEventService;
    }

    @GetMapping
    public ResponseEntity<List<CalendarEventResponse>> getEvents(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(calendarEventService.getEvents(from, to));
    }

    @PostMapping
    public ResponseEntity<CalendarEventResponse> createEvent(
            @Valid @RequestBody CalendarEventRequest request
    ) {
        return ResponseEntity.ok(calendarEventService.createEvent(request));
    }
}
