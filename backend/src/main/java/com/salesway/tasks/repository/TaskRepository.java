package com.salesway.tasks.repository;

import com.salesway.tasks.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByCreatedByMembershipIdOrAssignedToMembershipId(UUID createdByMembershipId, UUID assignedToMembershipId);

    void deleteByCreatedByMembershipIdOrAssignedToMembershipId(UUID createdByMembershipId, UUID assignedToMembershipId);
}
