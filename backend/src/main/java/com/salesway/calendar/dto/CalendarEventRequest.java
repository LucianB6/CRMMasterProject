package com.salesway.calendar.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public class CalendarEventRequest {
    @NotNull
    @JsonProperty("event_date")
    private LocalDate eventDate;

    @NotNull
    @JsonProperty("start_time")
    private LocalTime startTime;

    @NotNull
    @JsonProperty("end_time")
    private LocalTime endTime;

    @NotBlank
    @Size(max = 255)
    @JsonProperty("title")
    private String title;

    public LocalDate getEventDate() {
        return eventDate;
    }

    public void setEventDate(LocalDate eventDate) {
        this.eventDate = eventDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
