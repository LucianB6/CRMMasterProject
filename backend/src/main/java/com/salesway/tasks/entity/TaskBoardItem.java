package com.salesway.tasks.entity;

import com.salesway.common.auditing.AuditedEntity;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.tasks.enums.TaskBoardStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "task_board_items", indexes = {
        @Index(name = "idx_task_board_items_membership_status", columnList = "membership_id,status")
})
public class TaskBoardItem extends AuditedEntity {
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "membership_id", nullable = false)
    private CompanyMembership membership;

    @Column(name = "lead_id")
    private UUID leadId;

    @Column(name = "assignee_user_id")
    private UUID assigneeUserId;

    @NotBlank
    @Size(max = 255)
    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "goal", columnDefinition = "text")
    private String goal;

    @Column(name = "deadline")
    private LocalDate deadline;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TaskBoardStatus status = TaskBoardStatus.TODO;

    public CompanyMembership getMembership() {
        return membership;
    }

    public void setMembership(CompanyMembership membership) {
        this.membership = membership;
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

    public TaskBoardStatus getStatus() {
        return status;
    }

    public void setStatus(TaskBoardStatus status) {
        this.status = status;
    }
}
