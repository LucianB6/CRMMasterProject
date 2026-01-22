package com.salesway.tasks.repository;

import com.salesway.tasks.entity.TaskBoardItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TaskBoardItemRepository extends JpaRepository<TaskBoardItem, UUID> {
    List<TaskBoardItem> findByMembershipIdOrderByCreatedAtDesc(UUID membershipId);
}
