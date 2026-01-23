package com.salesway.goals.repository;

import com.salesway.goals.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GoalRepository extends JpaRepository<Goal, UUID> {
    List<Goal> findByMembershipIdOrderByCreatedAtDesc(UUID membershipId);

    void deleteByMembershipId(UUID membershipId);
}
