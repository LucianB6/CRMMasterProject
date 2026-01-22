package com.salesway.tasks.service;

import com.salesway.common.enums.MembershipStatus;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.CustomUserDetails;
import com.salesway.tasks.dto.TaskBoardRequest;
import com.salesway.tasks.dto.TaskBoardResponse;
import com.salesway.tasks.dto.TaskBoardStatusRequest;
import com.salesway.tasks.entity.TaskBoardItem;
import com.salesway.tasks.enums.TaskBoardStatus;
import com.salesway.tasks.repository.TaskBoardItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
public class TaskBoardService {
    private final TaskBoardItemRepository taskBoardItemRepository;
    private final CompanyMembershipRepository companyMembershipRepository;

    public TaskBoardService(
            TaskBoardItemRepository taskBoardItemRepository,
            CompanyMembershipRepository companyMembershipRepository
    ) {
        this.taskBoardItemRepository = taskBoardItemRepository;
        this.companyMembershipRepository = companyMembershipRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskBoardResponse> getTasks() {
        CompanyMembership membership = getReportingMembership(true);
        return taskBoardItemRepository
                .findByMembershipIdOrderByCreatedAtDesc(membership.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TaskBoardResponse createTask(TaskBoardRequest request) {
        CompanyMembership membership = getReportingMembership(true);

        TaskBoardItem task = new TaskBoardItem();
        task.setMembership(membership);
        task.setTitle(request.getTitle());
        task.setGoal(request.getGoal());
        task.setDeadline(request.getDeadline());
        task.setStatus(toEntityStatus(request.getStatus()));

        TaskBoardItem saved = taskBoardItemRepository.save(task);
        return toResponse(saved);
    }

    @Transactional
    public TaskBoardResponse updateTask(UUID taskId, TaskBoardRequest request) {
        CompanyMembership membership = getReportingMembership(true);

        TaskBoardItem task = taskBoardItemRepository
                .findById(taskId)
                .filter(item -> item.getMembership().getId().equals(membership.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        task.setTitle(request.getTitle());
        task.setGoal(request.getGoal());
        task.setDeadline(request.getDeadline());
        task.setStatus(toEntityStatus(request.getStatus()));

        TaskBoardItem saved = taskBoardItemRepository.save(task);
        return toResponse(saved);
    }

    @Transactional
    public void deleteTask(UUID taskId) {
        CompanyMembership membership = getReportingMembership(true);
        TaskBoardItem task = taskBoardItemRepository
                .findById(taskId)
                .filter(item -> item.getMembership().getId().equals(membership.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        taskBoardItemRepository.delete(task);
    }

    private TaskBoardResponse toResponse(TaskBoardItem item) {
        return new TaskBoardResponse(
                item.getId(),
                item.getTitle(),
                item.getGoal(),
                item.getDeadline(),
                toRequestStatus(item.getStatus())
        );
    }

    private TaskBoardStatus toEntityStatus(TaskBoardStatusRequest status) {
        if (status == null) {
            return TaskBoardStatus.TODO;
        }
        return switch (status) {
            case TODO -> TaskBoardStatus.TODO;
            case IN_PROGRESS -> TaskBoardStatus.IN_PROGRESS;
            case DONE -> TaskBoardStatus.DONE;
        };
    }

    private TaskBoardStatusRequest toRequestStatus(TaskBoardStatus status) {
        if (status == null) {
            return TaskBoardStatusRequest.TODO;
        }
        return switch (status) {
            case TODO -> TaskBoardStatusRequest.TODO;
            case IN_PROGRESS -> TaskBoardStatusRequest.IN_PROGRESS;
            case DONE -> TaskBoardStatusRequest.DONE;
        };
    }

    private CompanyMembership getReportingMembership(boolean allowInvited) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication");
        }

        EnumSet<MembershipStatus> eligibleStatuses = allowInvited
                ? EnumSet.of(MembershipStatus.ACTIVE, MembershipStatus.INVITED)
                : EnumSet.of(MembershipStatus.ACTIVE);

        return companyMembershipRepository
                .findFirstByUserIdAndStatusIn(userDetails.getUser().getId(), eligibleStatuses)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No eligible membership found"));
    }
}
