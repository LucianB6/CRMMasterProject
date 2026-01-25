package com.salesway.ml.repository;

import com.salesway.ml.entity.MlPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MlPredictionRepository extends JpaRepository<MlPrediction, UUID>, JpaSpecificationExecutor<MlPrediction> {
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

}
