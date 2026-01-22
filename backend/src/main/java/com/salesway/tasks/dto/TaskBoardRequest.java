package com.salesway.tasks.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class TaskBoardRequest {
    @NotBlank
    @Size(max = 255)
    @JsonProperty("title")
    private String title;

    @JsonProperty("goal")
    private String goal;

    @JsonProperty("deadline")
    private LocalDate deadline;

    @NotNull
    @JsonProperty("status")
    private TaskBoardStatusRequest status;

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
