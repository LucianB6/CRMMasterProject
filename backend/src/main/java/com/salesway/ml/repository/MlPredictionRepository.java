package com.salesway.ml.repository;

import com.salesway.ml.entity.MlPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MlPredictionRepository extends JpaRepository<MlPrediction, UUID> {
    Optional<MlPrediction> findByCompanyIdAndModelIdAndPredictionDateAndHorizonDays(
            UUID companyId,
            UUID modelId,
            LocalDate predictionDate,
            Integer horizonDays
    );

    List<MlPrediction> findByCompanyIdAndModelIdAndHorizonDaysAndPredictionDate(
            UUID companyId,
            UUID modelId,
            Integer horizonDays,
            LocalDate predictionDate
    );

    Optional<MlPrediction> findFirstByCompanyIdAndModelIdAndHorizonDaysOrderByPredictionDateDesc(
            UUID companyId,
            UUID modelId,
            Integer horizonDays
    );

    @Query("""
            select p from MlPrediction p
            where p.company.id = :companyId
              and (:modelId is null or p.model.id = :modelId)
              and (:horizonDays is null or p.horizonDays = :horizonDays)
              and (:fromDate is null or p.predictionDate >= :fromDate)
              and (:toDate is null or p.predictionDate <= :toDate)
            order by p.predictionDate desc
            """)
    List<MlPrediction> findByCompanyAndFilters(
            @Param("companyId") UUID companyId,
            @Param("modelId") UUID modelId,
            @Param("horizonDays") Integer horizonDays,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );
}
