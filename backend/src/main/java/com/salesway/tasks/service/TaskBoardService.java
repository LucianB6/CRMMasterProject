package com.salesway.tasks.service;

import com.salesway.common.enums.MembershipStatus;
import com.salesway.leads.entity.Lead;
import com.salesway.leads.enums.LeadEventType;
import com.salesway.leads.repository.LeadRepository;
import com.salesway.leads.service.LeadEventService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.AuthenticatedUserService;
import com.salesway.security.CustomUserDetails;
import com.salesway.tasks.dto.TaskBoardRequest;
import com.salesway.tasks.dto.TaskBoardResponse;
import com.salesway.tasks.dto.TaskBoardStatusRequest;
import com.salesway.tasks.entity.TaskBoardItem;
import com.salesway.tasks.enums.TaskBoardStatus;
import com.salesway.tasks.repository.TaskBoardItemRepository;
import com.salesway.tasks.repository.TaskBoardItemSpecifications;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TaskBoardService {
    private final TaskBoardItemRepository taskBoardItemRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final LeadRepository leadRepository;
    private final LeadEventService leadEventService;
    private final AuthenticatedUserService authenticatedUserService;

    public TaskBoardService(
            TaskBoardItemRepository taskBoardItemRepository,
            CompanyMembershipRepository companyMembershipRepository,
            LeadRepository leadRepository,
            LeadEventService leadEventService,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.taskBoardItemRepository = taskBoardItemRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.leadRepository = leadRepository;
        this.leadEventService = leadEventService;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional(readOnly = true)
    public List<TaskBoardResponse> getTasks(
            UUID leadId,
            String assignee,
            TaskBoardStatusRequest status,
            LocalDate dueFrom,
            LocalDate dueTo
    ) {
        CompanyMembership membership = getReportingMembership(true);
        UUID assigneeUserId = resolveAssigneeFilter(assignee, membership);
        return getTasksForCompany(
                membership.getCompany().getId(),
                leadId,
                assigneeUserId,
                toEntityStatus(status),
                dueFrom,
                dueTo
        );
    }

    @Transactional(readOnly = true)
    public List<TaskBoardResponse> getTasksForCompany(
            UUID companyId,
            UUID leadId,
            UUID assigneeUserId,
            TaskBoardStatus status,
            LocalDate dueFrom,
            LocalDate dueTo
    ) {
        if (dueFrom != null && dueTo != null && dueFrom.isAfter(dueTo)) {
            throw new IllegalArgumentException("dueFrom must be <= dueTo");
        }
        if (leadId != null) {
            ensureLeadBelongsToCompany(leadId, companyId);
        }
        if (assigneeUserId != null) {
            companyMembershipRepository.findByCompanyIdAndUserId(companyId, assigneeUserId)
                    .orElseThrow(() -> new IllegalArgumentException("assignee user not found in current company"));
        }
        return taskBoardItemRepository.findAll(
                        TaskBoardItemSpecifications.byCompanyAndFilters(
                                companyId,
                                leadId,
                                assigneeUserId,
                                status,
                                dueFrom,
                                dueTo
                        ),
                        Sort.by(Sort.Direction.DESC, "createdAt")
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TaskBoardResponse createTask(TaskBoardRequest request) {
        CompanyMembership membership = getReportingMembership(true);
        UUID companyId = membership.getCompany().getId();
        TaskBoardItem task = new TaskBoardItem();
        task.setMembership(membership);
        task.setTitle(request.getTitle());
        task.setGoal(request.resolvedGoal());
        task.setDeadline(request.resolvedDeadline());
        task.setStatus(toEntityStatus(request.getStatus()));
        task.setAssigneeUserId(resolveAssigneeOnWrite(request.getAssigneeUserId(), companyId));
        task.setLeadId(resolveLeadOnWrite(request.getLeadId(), companyId));

        TaskBoardItem saved = taskBoardItemRepository.save(task);
        appendTaskEventOnCreate(saved, companyId);
        return toResponse(saved);
    }

    @Transactional
    public TaskBoardResponse updateTask(UUID taskId, TaskBoardRequest request) {
        CompanyMembership membership = getReportingMembership(true);
        UUID companyId = membership.getCompany().getId();

        TaskBoardItem task = taskBoardItemRepository.findByIdAndCompanyId(taskId, companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        TaskBoardStatus oldStatus = task.getStatus();
        task.setTitle(request.getTitle());
        task.setGoal(request.resolvedGoal());
        task.setDeadline(request.resolvedDeadline());
        task.setStatus(toEntityStatus(request.getStatus()));
        task.setAssigneeUserId(resolveAssigneeOnWrite(request.getAssigneeUserId(), companyId));
        task.setLeadId(resolveLeadOnWrite(request.getLeadId(), companyId));

        TaskBoardItem saved = taskBoardItemRepository.save(task);
        appendTaskEventOnUpdate(saved, companyId, oldStatus);
        return toResponse(saved);
    }

    @Transactional
    public void deleteTask(UUID taskId) {
        CompanyMembership membership = getReportingMembership(true);
        TaskBoardItem task = taskBoardItemRepository.findByIdAndCompanyId(taskId, membership.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
        taskBoardItemRepository.delete(task);
    }

    private TaskBoardResponse toResponse(TaskBoardItem item) {
        return new TaskBoardResponse(
                item.getId(),
                item.getTitle(),
                item.getGoal(),
                item.getGoal(),
                item.getDeadline(),
                item.getDeadline(),
                toRequestStatus(item.getStatus()),
                item.getLeadId(),
                item.getAssigneeUserId()
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

    private UUID resolveLeadOnWrite(UUID leadId, UUID companyId) {
        if (leadId == null) {
            return null;
        }
        ensureLeadBelongsToCompany(leadId, companyId);
        return leadId;
    }

    private UUID resolveAssigneeOnWrite(UUID assigneeUserId, UUID companyId) {
        if (assigneeUserId == null) {
            return null;
        }
        companyMembershipRepository.findByCompanyIdAndUserId(companyId, assigneeUserId)
                .filter(membership -> membership.getStatus() == MembershipStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("assigneeUserId does not belong to current company"));
        return assigneeUserId;
    }

    private UUID resolveAssigneeFilter(String assignee, CompanyMembership membership) {
        if (assignee == null || assignee.isBlank()) {
            return null;
        }
        if ("me".equalsIgnoreCase(assignee.trim())) {
            return authenticatedUserService.requireCurrentUserId();
        }
        UUID parsed;
        try {
            parsed = UUID.fromString(assignee.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("assignee must be UUID or 'me'");
        }
        companyMembershipRepository.findByCompanyIdAndUserId(membership.getCompany().getId(), parsed)
                .orElseThrow(() -> new IllegalArgumentException("assignee user not found in current company"));
        return parsed;
    }

    private void ensureLeadBelongsToCompany(UUID leadId, UUID companyId) {
        leadRepository.findByIdAndCompanyId(leadId, companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "leadId does not belong to current company"));
    }

    private void appendTaskEventOnCreate(TaskBoardItem task, UUID companyId) {
        if (task.getLeadId() == null) {
            return;
        }
        Lead lead = leadRepository.findByIdAndCompanyId(task.getLeadId(), companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "leadId does not belong to current company"));
        leadEventService.appendEvent(
                lead,
                LeadEventType.TASK_CREATED,
                "Task created for lead",
                Map.of("taskId", task.getId(), "title", task.getTitle(), "status", task.getStatus().name())
        );
        if (task.getStatus() == TaskBoardStatus.DONE) {
            leadEventService.appendEvent(
                    lead,
                    LeadEventType.TASK_COMPLETED,
                    "Task completed for lead",
                    Map.of("taskId", task.getId(), "title", task.getTitle())
            );
        }
    }

    private void appendTaskEventOnUpdate(TaskBoardItem task, UUID companyId, TaskBoardStatus oldStatus) {
        if (task.getLeadId() == null) {
            return;
        }
        if (oldStatus == TaskBoardStatus.DONE || task.getStatus() != TaskBoardStatus.DONE) {
            return;
        }
        Lead lead = leadRepository.findByIdAndCompanyId(task.getLeadId(), companyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "leadId does not belong to current company"));
        leadEventService.appendEvent(
                lead,
                LeadEventType.TASK_COMPLETED,
                "Task completed for lead",
                Map.of("taskId", task.getId(), "title", task.getTitle())
        );
    }
}
