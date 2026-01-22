package com.salesway.tasks.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;
import java.util.UUID;

public class TaskBoardResponse {
    @JsonProperty("id")
    private UUID id;

    @JsonProperty("title")
    private String title;

    @JsonProperty("goal")
    private String goal;

    @JsonProperty("deadline")
    private LocalDate deadline;

    @JsonProperty("status")
    private TaskBoardStatusRequest status;

    public TaskBoardResponse() {
    }

    public TaskBoardResponse(UUID id, String title, String goal, LocalDate deadline, TaskBoardStatusRequest status) {
        this.id = id;
        this.title = title;
        this.goal = goal;
        this.deadline = deadline;
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public LocalDate getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDate deadline) {
        this.deadline = deadline;
    }

    public TaskBoardStatusRequest getStatus() {
        return status;
    }

    public void setStatus(TaskBoardStatusRequest status) {
        this.status = status;
    }
}
