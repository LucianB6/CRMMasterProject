package com.salesway.ml.repository;

import com.salesway.ml.entity.MlPrediction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MlPredictionRepository extends JpaRepository<MlPrediction, UUID> {
}
