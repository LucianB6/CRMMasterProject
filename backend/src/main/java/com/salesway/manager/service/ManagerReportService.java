package com.salesway.manager.service;

import com.salesway.common.enums.DailyReportAuditAction;
import com.salesway.common.enums.DailyReportStatus;
import com.salesway.manager.dto.ManagerDailyReportResponse;
import com.salesway.manager.dto.ManagerDailyReportUpdateRequest;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.reports.dto.DailyReportInputsResponse;
import com.salesway.reports.entity.DailyReport;
import com.salesway.reports.entity.DailyReportAuditLog;
import com.salesway.reports.entity.DailyReportInputs;
import com.salesway.reports.entity.DailyReportMetrics;
import com.salesway.reports.repository.DailyReportAuditLogRepository;
import com.salesway.reports.repository.DailyReportInputsRepository;
import com.salesway.reports.repository.DailyReportMetricsRepository;
import com.salesway.reports.repository.DailyReportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ManagerReportService {
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final ManagerAccessService managerAccessService;
    private final DailyReportRepository dailyReportRepository;
    private final DailyReportInputsRepository dailyReportInputsRepository;
    private final DailyReportMetricsRepository dailyReportMetricsRepository;
    private final DailyReportAuditLogRepository dailyReportAuditLogRepository;

    public ManagerReportService(
            ManagerAccessService managerAccessService,
            DailyReportRepository dailyReportRepository,
            DailyReportInputsRepository dailyReportInputsRepository,
            DailyReportMetricsRepository dailyReportMetricsRepository,
            DailyReportAuditLogRepository dailyReportAuditLogRepository
    ) {
        this.managerAccessService = managerAccessService;
        this.dailyReportRepository = dailyReportRepository;
        this.dailyReportInputsRepository = dailyReportInputsRepository;
        this.dailyReportMetricsRepository = dailyReportMetricsRepository;
        this.dailyReportAuditLogRepository = dailyReportAuditLogRepository;
    }

    @Transactional(readOnly = true)
    public List<ManagerDailyReportResponse> getReports(LocalDate from, LocalDate to, UUID agentMembershipId) {
        validateDateRange(from, to);
        CompanyMembership manager = managerAccessService.getManagerMembership();
        List<DailyReport> reports;
        if (agentMembershipId != null) {
            reports = dailyReportRepository.findByCompanyIdAndAgentMembershipIdAndReportDateBetweenOrderByReportDateAsc(
                    manager.getCompany().getId(),
                    agentMembershipId,
                    from,
                    to
            );
        } else {
            reports = dailyReportRepository.findByCompanyIdAndReportDateBetweenOrderByReportDateAsc(
                    manager.getCompany().getId(),
                    from,
                    to
            );
        }

        if (reports.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, DailyReportInputs> inputsByReportId = fetchInputsByReportId(reports);
        return reports.stream()
                .map(report -> toManagerResponse(report, inputsByReportId.getOrDefault(report.getId(), new DailyReportInputs())))
                .toList();
    }

    @Transactional
    public ManagerDailyReportResponse updateReport(UUID reportId, ManagerDailyReportUpdateRequest request) {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        DailyReport report = dailyReportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));

        if (!report.getCompany().getId().equals(manager.getCompany().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Report does not belong to company");
        }

        if (report.getLockedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Report is locked");
        }

        DailyReportInputs inputs = dailyReportInputsRepository
                .findByDailyReportId(report.getId())
                .orElseGet(() -> {
                    DailyReportInputs fresh = new DailyReportInputs();
                    fresh.setDailyReport(report);
                    return fresh;
                });

        applyInputs(inputs, request);
        dailyReportInputsRepository.save(inputs);

        report.setStatus(request.getStatus());
        if (request.getStatus() == DailyReportStatus.SUBMITTED) {
            report.setSubmittedAt(Instant.now());
            report.setSubmittedByMembership(manager);
        } else {
            report.setSubmittedAt(null);
            report.setSubmittedByMembership(null);
        }
        dailyReportRepository.save(report);
        updateMetrics(report, inputs);
        writeAudit(report, manager, DailyReportAuditAction.MANAGER_EDIT);

        return toManagerResponse(report, inputs);
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date range is required");
        }
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date range");
        }
    }

    private Map<UUID, DailyReportInputs> fetchInputsByReportId(List<DailyReport> reports) {
        List<UUID> reportIds = reports.stream()
                .map(DailyReport::getId)
                .toList();
        if (reportIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return dailyReportInputsRepository.findByDailyReportIdIn(reportIds).stream()
                .collect(Collectors.toMap(DailyReportInputs::getId, Function.identity()));
    }

    private void applyInputs(DailyReportInputs inputs, ManagerDailyReportUpdateRequest request) {
        inputs.setOutboundDials(request.getOutboundDials());
        inputs.setPickups(request.getPickups());
        inputs.setConversations30sPlus(request.getConversations30sPlus());
        inputs.setSalesCallBookedFromOutbound(request.getSalesCallBookedFromOutbound());
        inputs.setSalesCallOnCalendar(request.getSalesCallOnCalendar());
        inputs.setNoShow(request.getNoShow());
        inputs.setRescheduleRequest(request.getRescheduleRequest());
        inputs.setCancel(request.getCancel());
        inputs.setDeposits(request.getDeposits());
        inputs.setSalesOneCallClose(request.getSalesOneCallClose());
        inputs.setFollowupSales(request.getFollowupSales());
        inputs.setUpsellConversationTaken(request.getUpsellConversationTaken());
        inputs.setUpsells(request.getUpsells());
        inputs.setContractValue(request.getContractValue());
        inputs.setNewCashCollected(request.getNewCashCollected());
    }

    private void updateMetrics(DailyReport report, DailyReportInputs inputs) {
        DailyReportMetrics metrics = dailyReportMetricsRepository
                .findByDailyReportId(report.getId())
                .orElseGet(() -> {
                    DailyReportMetrics fresh = new DailyReportMetrics();
                    fresh.setDailyReport(report);
                    return fresh;
                });

        int totalSales = inputs.getSalesOneCallClose() + inputs.getFollowupSales() + inputs.getUpsells();
        metrics.setTotalSales(totalSales);
        metrics.setTriagePassthroughRate(rate(inputs.getPickups(), inputs.getOutboundDials()));

        int salesCallShowups = Math.max(0, inputs.getSalesCallOnCalendar() - inputs.getNoShow() - inputs.getCancel());
        metrics.setSalesCallShowupRate(rate(salesCallShowups, inputs.getSalesCallOnCalendar()));
        metrics.setSitRate(rate(inputs.getSalesCallBookedFromOutbound(), inputs.getConversations30sPlus()));
        metrics.setOneCallCloseRate(rate(inputs.getSalesOneCallClose(), totalSales));
        metrics.setFollowupCloseRate(rate(inputs.getFollowupSales(), totalSales));
        metrics.setTotalClosingRate(rate(totalSales, inputs.getSalesCallOnCalendar()));
        metrics.setUpsellCloseRate(rate(inputs.getUpsells(), inputs.getUpsellConversationTaken()));
        metrics.setCashCollectionRate(rate(inputs.getNewCashCollected(), inputs.getContractValue()));
        metrics.setAvgContractValuePerSale(divide(inputs.getContractValue(), totalSales, 2));
        metrics.setAvgCashCollectedPerSale(divide(inputs.getNewCashCollected(), totalSales, 2));
        metrics.setComputedAt(Instant.now());

        dailyReportMetricsRepository.save(metrics);
    }

    private BigDecimal rate(int numerator, int denominator) {
        return divide(new BigDecimal(numerator), denominator, 5);
    }

    private BigDecimal rate(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(ZERO) <= 0) {
            return ZERO;
        }
        return numerator.divide(denominator, 5, RoundingMode.HALF_UP);
    }

    private BigDecimal divide(BigDecimal numerator, int denominator, int scale) {
        if (denominator <= 0) {
            return ZERO;
        }
        return numerator.divide(new BigDecimal(denominator), scale, RoundingMode.HALF_UP);
    }

    private ManagerDailyReportResponse toManagerResponse(DailyReport report, DailyReportInputs inputs) {
        DailyReportInputsResponse inputsResponse = new DailyReportInputsResponse(
                inputs.getOutboundDials(),
                inputs.getPickups(),
                inputs.getConversations30sPlus(),
                inputs.getSalesCallBookedFromOutbound(),
                inputs.getSalesCallOnCalendar(),
                inputs.getNoShow(),
                inputs.getRescheduleRequest(),
                inputs.getCancel(),
                inputs.getDeposits(),
                inputs.getSalesOneCallClose(),
                inputs.getFollowupSales(),
                inputs.getUpsellConversationTaken(),
                inputs.getUpsells(),
                inputs.getContractValue(),
                inputs.getNewCashCollected()
        );

        return new ManagerDailyReportResponse(
                report.getId(),
                report.getReportDate(),
                report.getStatus(),
                report.getSubmittedAt(),
                report.getAgentMembership().getId(),
                report.getAgentMembership().getUser().getEmail(),
                inputsResponse
        );
    }

    private void writeAudit(DailyReport report, CompanyMembership membership, DailyReportAuditAction action) {
        DailyReportAuditLog log = new DailyReportAuditLog();
        log.setDailyReport(report);
        log.setActorMembership(membership);
        log.setAction(action);
        dailyReportAuditLogRepository.save(log);
    }
}
