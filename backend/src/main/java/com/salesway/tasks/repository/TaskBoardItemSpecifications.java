package com.salesway.tasks.repository;

import com.salesway.tasks.entity.TaskBoardItem;
import com.salesway.tasks.enums.TaskBoardStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class TaskBoardItemSpecifications {
    private TaskBoardItemSpecifications() {
    }

    public static Specification<TaskBoardItem> byCompanyAndFilters(
            UUID companyId,
            UUID leadId,
            UUID assigneeUserId,
            TaskBoardStatus status,
            LocalDate dueFrom,
            LocalDate dueTo
    ) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("membership").get("company").get("id"), companyId));
            if (leadId != null) {
                predicates.add(cb.equal(root.get("leadId"), leadId));
            }
            if (assigneeUserId != null) {
                predicates.add(cb.equal(root.get("assigneeUserId"), assigneeUserId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (dueFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("deadline"), dueFrom));
            }
            if (dueTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("deadline"), dueTo));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
