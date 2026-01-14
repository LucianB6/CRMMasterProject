package com.salesway.tasks.repository;

import com.salesway.tasks.entity.TaskProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TaskProgressRepository extends JpaRepository<TaskProgress, UUID> {
}
