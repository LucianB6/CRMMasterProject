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

    @JsonProperty("description")
    private String description;

    @JsonProperty("deadline")
    private LocalDate deadline;

    @JsonProperty("dueDate")
    private LocalDate dueDate;

    @NotNull
    @JsonProperty("status")
    private TaskBoardStatusRequest status;

    @JsonProperty("leadId")
    private java.util.UUID leadId;

    @JsonProperty("assigneeUserId")
    private java.util.UUID assigneeUserId;

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDate deadline) {
        this.deadline = deadline;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public TaskBoardStatusRequest getStatus() {
        return status;
    }

    public void setStatus(TaskBoardStatusRequest status) {
        this.status = status;
    }

    public java.util.UUID getLeadId() {
        return leadId;
    }

    public void setLeadId(java.util.UUID leadId) {
        this.leadId = leadId;
    }

    public java.util.UUID getAssigneeUserId() {
        return assigneeUserId;
    }

    public void setAssigneeUserId(java.util.UUID assigneeUserId) {
        this.assigneeUserId = assigneeUserId;
    }

    public String resolvedGoal() {
        return description != null ? description : goal;
    }

    public LocalDate resolvedDeadline() {
        return dueDate != null ? dueDate : deadline;
    }
}
