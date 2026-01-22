package com.salesway.goals.service;

import com.salesway.common.enums.MembershipStatus;
import com.salesway.goals.dto.GoalRequest;
import com.salesway.goals.dto.GoalResponse;
import com.salesway.goals.entity.Goal;
import com.salesway.goals.repository.GoalRepository;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.security.CustomUserDetails;
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
public class GoalService {
    private final GoalRepository goalRepository;
    private final CompanyMembershipRepository companyMembershipRepository;

    public GoalService(
            GoalRepository goalRepository,
            CompanyMembershipRepository companyMembershipRepository
    ) {
        this.goalRepository = goalRepository;
        this.companyMembershipRepository = companyMembershipRepository;
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> getGoals() {
        CompanyMembership membership = getReportingMembership(true);
        return goalRepository
                .findByMembershipIdOrderByCreatedAtDesc(membership.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public GoalResponse createGoal(GoalRequest request) {
        CompanyMembership membership = getReportingMembership(true);

        Goal goal = new Goal();
        goal.setMembership(membership);
        goal.setTitle(request.getTitle());
        goal.setMetricKey(request.getMetricKey());
        goal.setTargetValue(request.getTarget());
        goal.setStartDate(request.getDateFrom());
        goal.setEndDate(request.getDateTo());

        Goal saved = goalRepository.save(goal);
        return toResponse(saved);
    }

    @Transactional
    public void deleteGoal(UUID goalId) {
        CompanyMembership membership = getReportingMembership(true);
        Goal goal = goalRepository
                .findById(goalId)
                .filter(item -> item.getMembership().getId().equals(membership.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
        goalRepository.delete(goal);
    }

    private GoalResponse toResponse(Goal goal) {
        return new GoalResponse(
                goal.getId(),
                goal.getTitle(),
                goal.getMetricKey(),
                goal.getTargetValue(),
                goal.getStartDate(),
                goal.getEndDate()
        );
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
