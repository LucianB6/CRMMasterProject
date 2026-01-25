package com.salesway.ml.service;

import com.salesway.common.enums.MembershipStatus;
import com.salesway.common.enums.MlModelStatus;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.ml.client.MlFastApiClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.salesway.ml.dto.ForecastResponse;
import com.salesway.ml.dto.MlModelResponse;
import com.salesway.ml.dto.MlPredictionResponse;
import com.salesway.ml.dto.PredictRequest;
import com.salesway.ml.dto.TrainRequest;
import com.salesway.ml.entity.MlModel;
import com.salesway.ml.entity.MlPrediction;
import com.salesway.ml.repository.MlModelRepository;
import com.salesway.ml.repository.MlPredictionRepository;
import com.salesway.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MlService {
    private final MlFastApiClient mlFastApiClient;
    private final MlModelRepository mlModelRepository;
    private final MlPredictionRepository mlPredictionRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final ObjectMapper objectMapper;
    private final String mlBaseUrl;

    public MlService(
            MlFastApiClient mlFastApiClient,
            MlModelRepository mlModelRepository,
            MlPredictionRepository mlPredictionRepository,
            CompanyMembershipRepository companyMembershipRepository,
            ObjectMapper objectMapper,
            @Value("${app.ml.base-url}") String mlBaseUrl
    ) {
        this.mlFastApiClient = mlFastApiClient;
        this.mlModelRepository = mlModelRepository;
        this.mlPredictionRepository = mlPredictionRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.objectMapper = objectMapper;
        this.mlBaseUrl = mlBaseUrl;
    }

    @Transactional
    public MlModelResponse trainModel(TrainRequest request) {
        CompanyMembership membership = getReportingMembership(false);

        mlModelRepository
                .findByCompanyIdAndNameAndVersion(membership.getCompany().getId(), request.getName(), request.getVersion())
                .ifPresent(model -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Model version already exists");
                });

        mlFastApiClient.refreshForecast(membership.getCompany().getId());
        ForecastResponse forecastResponse = mlFastApiClient.getForecast(
                request.getHorizonDays(),
                membership.getCompany().getId()
        );

        List<MlModel> activeModels = mlModelRepository.findByCompanyIdAndNameAndStatus(
                membership.getCompany().getId(),
                request.getName(),
                MlModelStatus.ACTIVE
        );

        for (MlModel model : activeModels) {
            model.setStatus(MlModelStatus.DEPRECATED);
        }
        mlModelRepository.saveAll(activeModels);

        MlModel model = new MlModel();
        model.setCompany(membership.getCompany());
        model.setName(request.getName());
        model.setVersion(request.getVersion());
        model.setStatus(MlModelStatus.ACTIVE);
        Instant trainedAt = forecastResponse.getTrainedAt() != null ? forecastResponse.getTrainedAt() : Instant.now();
        model.setTrainedAt(trainedAt);
        model.setMetricsJsonText(toMetricsJson(forecastResponse));
        model.setArtifactUri(mlBaseUrl + "/forecast");
        if (forecastResponse.getModelId() != null) {
            model.setId(forecastResponse.getModelId());
        }

        MlModel saved = mlModelRepository.save(model);
        return toModelResponse(saved);
    }

    @Transactional
    public List<MlPredictionResponse> refreshPredictions(PredictRequest request) {
        CompanyMembership membership = getReportingMembership(false);

        MlModel model = mlModelRepository
                .findByIdAndCompanyId(request.getModelId(), membership.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Model not found"));

        mlFastApiClient.refreshForecast(membership.getCompany().getId());
        ForecastResponse forecastResponse = mlFastApiClient.getForecast(
                request.getHorizonDays(),
                membership.getCompany().getId()
        );
        List<ForecastResponse.DailyPrediction> items = Optional.ofNullable(forecastResponse.getDailyPredictions())
                .orElseGet(List::of);

        List<MlPrediction> predictions = new ArrayList<>();
        for (ForecastResponse.DailyPrediction item : items) {
            if (item.getDate() == null || item.getValue() == null) {
                continue;
            }

            MlPrediction prediction = mlPredictionRepository
                    .findByCompanyIdAndModelIdAndPredictionDateAndHorizonDays(
                            membership.getCompany().getId(),
                            model.getId(),
                            item.getDate(),
                            1
                    )
                    .orElseGet(MlPrediction::new);

            if (prediction.getId() == null) {
                prediction.setCompany(membership.getCompany());
                prediction.setModel(model);
            }

            prediction.setPredictionDate(item.getDate());
            prediction.setHorizonDays(1);
            prediction.setPredictedRevenue(item.getValue());
            prediction.setLowerBound(null);
            prediction.setUpperBound(null);
            predictions.add(prediction);
        }

        LocalDate aggregateDate = items.stream()
                .map(ForecastResponse.DailyPrediction::getDate)
                .filter(date -> date != null)
                .min(LocalDate::compareTo)
                .orElse(request.getPredictionDate());
        if (forecastResponse.getTotal() != null && aggregateDate != null) {
            MlPrediction aggregate = mlPredictionRepository
                    .findByCompanyIdAndModelIdAndPredictionDateAndHorizonDays(
                            membership.getCompany().getId(),
                            model.getId(),
                            aggregateDate,
                            request.getHorizonDays()
                    )
                    .orElseGet(MlPrediction::new);

            if (aggregate.getId() == null) {
                aggregate.setCompany(membership.getCompany());
                aggregate.setModel(model);
            }

            aggregate.setPredictionDate(aggregateDate);
            aggregate.setHorizonDays(request.getHorizonDays());
            aggregate.setPredictedRevenue(forecastResponse.getTotal());
            aggregate.setLowerBound(null);
            aggregate.setUpperBound(null);
            predictions.add(aggregate);
        }

        List<MlPrediction> saved = mlPredictionRepository.saveAll(predictions);
        return saved.stream().map(this::toPredictionResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MlModelResponse> listModels(MlModelStatus status, String name) {
        CompanyMembership membership = getReportingMembership(false);
        return mlModelRepository
                .findByCompanyAndFilters(membership.getCompany().getId(), status, name)
                .stream()
                .map(this::toModelResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MlModelResponse getModel(UUID modelId) {
        CompanyMembership membership = getReportingMembership(false);
        MlModel model = mlModelRepository
                .findByIdAndCompanyId(modelId, membership.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Model not found"));
        return toModelResponse(model);
    }

    @Transactional(readOnly = true)
    public List<MlPredictionResponse> getLatestPredictions(Integer horizonDays, LocalDate predictionDate) {
        if (horizonDays == null || horizonDays <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "horizon_days is required");
        }

        CompanyMembership membership = getReportingMembership(false);
        MlModel model = mlModelRepository
                .findFirstByCompanyIdAndStatusOrderByTrainedAtDesc(
                        membership.getCompany().getId(),
                        MlModelStatus.ACTIVE
                )
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Active model not found"));

        LocalDate resolvedDate = predictionDate;
        if (resolvedDate == null) {
            resolvedDate = mlPredictionRepository
                    .findFirstByCompanyIdAndModelIdAndHorizonDaysOrderByPredictionDateDesc(
                            membership.getCompany().getId(),
                            model.getId(),
                            horizonDays
                    )
                    .map(MlPrediction::getPredictionDate)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Predictions not found"));
        }

        return mlPredictionRepository
                .findByCompanyIdAndModelIdAndHorizonDaysAndPredictionDate(
                        membership.getCompany().getId(),
                        model.getId(),
                        horizonDays,
                        resolvedDate
                )
                .stream()
                .map(this::toPredictionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MlPredictionResponse> getPredictions(
            LocalDate from,
            LocalDate to,
            UUID modelId,
            Integer horizonDays
    ) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date range");
        }

        CompanyMembership membership = getReportingMembership(false);
        return mlPredictionRepository
                .findByCompanyAndFilters(membership.getCompany().getId(), modelId, horizonDays, from, to)
                .stream()
                .map(this::toPredictionResponse)
                .toList();
    }

    private MlModelResponse toModelResponse(MlModel model) {
        return new MlModelResponse(
                model.getId(),
                model.getCompany().getId(),
                model.getName(),
                model.getVersion(),
                model.getStatus(),
                model.getTrainedAt(),
                model.getMetricsJsonText(),
                model.getArtifactUri()
        );
    }

    private MlPredictionResponse toPredictionResponse(MlPrediction prediction) {
        return new MlPredictionResponse(
                prediction.getId(),
                prediction.getCompany().getId(),
                prediction.getModel().getId(),
                prediction.getPredictionDate(),
                prediction.getHorizonDays(),
                prediction.getPredictedRevenue(),
                prediction.getLowerBound(),
                prediction.getUpperBound()
        );
    }

    private String toMetricsJson(ForecastResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private CompanyMembership getReportingMembership(boolean allowInvited) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication");
        }

        EnumSet<MembershipStatus> eligibleStatuses = allowInvited
                ? EnumSet.of(MembershipStatus.ACTIVE, MembershipStatus.INVITED)
                : EnumSet.of(MembershipStatus.ACTIVE);

        return companyMembershipRepository
                .findFirstByUserIdAndStatusIn(userDetails.getUser().getId(), eligibleStatuses)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "No eligible membership found"));
    }
}
