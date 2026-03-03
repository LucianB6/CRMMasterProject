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

    @JsonProperty("description")
    private String description;

    @JsonProperty("deadline")
    private LocalDate deadline;

    @JsonProperty("dueDate")
    private LocalDate dueDate;

    @JsonProperty("status")
    private TaskBoardStatusRequest status;

    @JsonProperty("leadId")
    private UUID leadId;

    @JsonProperty("assigneeUserId")
    private UUID assigneeUserId;

    public TaskBoardResponse() {
    }

    public TaskBoardResponse(
            UUID id,
            String title,
            String goal,
            String description,
            LocalDate deadline,
            LocalDate dueDate,
            TaskBoardStatusRequest status,
            UUID leadId,
            UUID assigneeUserId
    ) {
        this.id = id;
        this.title = title;
        this.goal = goal;
        this.description = description;
        this.deadline = deadline;
        this.dueDate = dueDate;
        this.status = status;
        this.leadId = leadId;
        this.assigneeUserId = assigneeUserId;
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

    public UUID getLeadId() {
        return leadId;
    }

    public void setLeadId(UUID leadId) {
        this.leadId = leadId;
    }

    public UUID getAssigneeUserId() {
        return assigneeUserId;
    }

    public void setAssigneeUserId(UUID assigneeUserId) {
        this.assigneeUserId = assigneeUserId;
    }
}
