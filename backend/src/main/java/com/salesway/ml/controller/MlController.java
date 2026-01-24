package com.salesway.ml.controller;

import com.salesway.common.enums.MlModelStatus;
import com.salesway.ml.dto.MlModelResponse;
import com.salesway.ml.dto.MlPredictionResponse;
import com.salesway.ml.dto.PredictRequest;
import com.salesway.ml.dto.TrainRequest;
import com.salesway.ml.service.MlService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ml")
public class MlController {
    private final MlService mlService;

    public MlController(MlService mlService) {
        this.mlService = mlService;
    }

    @PostMapping("/models/train")
    public ResponseEntity<MlModelResponse> trainModel(@Valid @RequestBody TrainRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mlService.trainModel(request));
    }

    @PostMapping("/predictions/refresh")
    public ResponseEntity<List<MlPredictionResponse>> refreshPredictions(
            @Valid @RequestBody PredictRequest request
    ) {
        return ResponseEntity.ok(mlService.refreshPredictions(request));
    }

    @GetMapping("/models")
    public ResponseEntity<List<MlModelResponse>> listModels(
            @RequestParam(value = "status", required = false) MlModelStatus status,
            @RequestParam(value = "name", required = false) String name
    ) {
        return ResponseEntity.ok(mlService.listModels(status, name));
    }

    @GetMapping("/models/{modelId}")
    public ResponseEntity<MlModelResponse> getModel(@PathVariable UUID modelId) {
        return ResponseEntity.ok(mlService.getModel(modelId));
    }

    @GetMapping("/predictions/latest")
    public ResponseEntity<List<MlPredictionResponse>> getLatestPredictions(
            @RequestParam("horizon_days") Integer horizonDays,
            @RequestParam(value = "prediction_date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate predictionDate
    ) {
        return ResponseEntity.ok(mlService.getLatestPredictions(horizonDays, predictionDate));
    }

    @GetMapping("/predictions")
    public ResponseEntity<List<MlPredictionResponse>> getPredictions(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "model_id", required = false) UUID modelId,
            @RequestParam(value = "horizon_days", required = false) Integer horizonDays
    ) {
        return ResponseEntity.ok(mlService.getPredictions(from, to, modelId, horizonDays));
    }
}
