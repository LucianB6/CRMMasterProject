package com.salesway.tasks.repository;

import com.salesway.tasks.entity.TaskBoardItem;
import com.salesway.tasks.enums.TaskBoardStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskBoardItemRepository extends JpaRepository<TaskBoardItem, UUID>, JpaSpecificationExecutor<TaskBoardItem> {
    List<TaskBoardItem> findByMembershipIdOrderByCreatedAtDesc(UUID membershipId);

    void deleteByMembershipId(UUID membershipId);

    @Query("""
            select count(t) > 0 from TaskBoardItem t
            join t.membership m
            where m.company.id = :companyId
              and t.leadId = :leadId
              and t.status <> :doneStatus
            """)
    boolean existsOpenByCompanyAndLeadId(
            @Param("companyId") UUID companyId,
            @Param("leadId") UUID leadId,
            @Param("doneStatus") TaskBoardStatus doneStatus
    );

    @Query("""
            select t from TaskBoardItem t
            join t.membership m
            where t.id = :taskId and m.company.id = :companyId
            """)
    Optional<TaskBoardItem> findByIdAndCompanyId(@Param("taskId") UUID taskId, @Param("companyId") UUID companyId);
}
