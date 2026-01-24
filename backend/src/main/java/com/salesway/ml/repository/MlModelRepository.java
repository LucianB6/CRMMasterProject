package com.salesway.ml.repository;

import com.salesway.common.enums.MlModelStatus;
import com.salesway.ml.entity.MlModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MlModelRepository extends JpaRepository<MlModel, UUID> {
    Optional<MlModel> findByIdAndCompanyId(UUID id, UUID companyId);

    Optional<MlModel> findFirstByCompanyIdAndNameAndStatusOrderByTrainedAtDesc(
            UUID companyId,
            String name,
            MlModelStatus status
    );

    Optional<MlModel> findByCompanyIdAndNameAndVersion(UUID companyId, String name, String version);

    List<MlModel> findByCompanyIdAndNameAndStatus(UUID companyId, String name, MlModelStatus status);

    Optional<MlModel> findFirstByCompanyIdAndStatusOrderByTrainedAtDesc(UUID companyId, MlModelStatus status);

    @Query("""
            select m from MlModel m
            where m.company.id = :companyId
              and (:status is null or m.status = :status)
              and (:name is null or m.name = :name)
            order by m.createdAt desc
            """)
    List<MlModel> findByCompanyAndFilters(
            @Param("companyId") UUID companyId,
            @Param("status") MlModelStatus status,
            @Param("name") String name
    );
}
