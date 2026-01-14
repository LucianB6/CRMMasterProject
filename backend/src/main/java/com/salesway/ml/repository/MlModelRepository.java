package com.salesway.ml.repository;

import com.salesway.ml.entity.MlModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MlModelRepository extends JpaRepository<MlModel, UUID> {
}
