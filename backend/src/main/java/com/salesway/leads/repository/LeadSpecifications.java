package com.salesway.leads.repository;

import com.salesway.leads.dto.LeadSearchCriteria;
import com.salesway.leads.entity.Lead;
import com.salesway.tasks.entity.TaskBoardItem;
import com.salesway.tasks.enums.TaskBoardStatus;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class LeadSpecifications {
    private LeadSpecifications() {
    }

    public static Specification<Lead> byCriteria(UUID companyId, LeadSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("company").get("id"), companyId));

            if (criteria.status() != null) {
                predicates.add(cb.equal(root.get("status"), criteria.status()));
            }
            if (criteria.createdFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("submittedAt"), criteria.createdFrom()));
            }
            if (criteria.createdTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("submittedAt"), criteria.createdTo()));
            }
            if (criteria.assignedToUserId() != null) {
                predicates.add(cb.equal(root.get("assignedToUserId"), criteria.assignedToUserId()));
            }
            if (criteria.visibleToUserId() != null) {
                Predicate assignedToViewer = cb.equal(root.get("assignedToUserId"), criteria.visibleToUserId());
                Predicate unassigned = cb.isNull(root.get("assignedToUserId"));
                predicates.add(criteria.includeUnassignedForVisibleUser()
                        ? cb.or(assignedToViewer, unassigned)
                        : assignedToViewer);
            }
            if (criteria.source() != null) {
                predicates.add(cb.equal(cb.upper(root.get("source")), criteria.source()));
            }
            if (criteria.q() != null && !criteria.q().isBlank()) {
                Join<Object, Object> standardJoin = root.join("standardFields", JoinType.LEFT);
                String pattern = "%" + criteria.q().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(standardJoin.get("firstName")), pattern),
                        cb.like(cb.lower(standardJoin.get("lastName")), pattern),
                        cb.like(cb.lower(standardJoin.get("email")), pattern),
                        cb.like(cb.lower(standardJoin.get("phone")), pattern)
                ));
            }
            if (criteria.hasOpenTasks() != null) {
                Subquery<UUID> taskSubquery = query.subquery(UUID.class);
                var taskRoot = taskSubquery.from(TaskBoardItem.class);
                Join<Object, Object> membershipJoin = taskRoot.join("membership", JoinType.INNER);
                taskSubquery.select(taskRoot.get("id"));
                taskSubquery.where(
                        cb.equal(taskRoot.get("leadId"), root.get("id")),
                        cb.equal(membershipJoin.get("company").get("id"), companyId),
                        cb.notEqual(taskRoot.get("status"), TaskBoardStatus.DONE)
                );
                Predicate existsPredicate = cb.exists(taskSubquery);
                predicates.add(Boolean.TRUE.equals(criteria.hasOpenTasks()) ? existsPredicate : cb.not(existsPredicate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
