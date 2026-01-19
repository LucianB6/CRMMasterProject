package com.salesway.reports.service;

import com.salesway.common.enums.DailyReportAuditAction;
import com.salesway.common.enums.DailyReportStatus;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.reports.dto.DailyReportInputsRequest;
import com.salesway.reports.dto.DailyReportInputsResponse;
import com.salesway.reports.dto.DailyReportResponse;
import com.salesway.reports.dto.DailyReportSummaryResponse;
import com.salesway.reports.entity.DailyReport;
import com.salesway.reports.entity.DailyReportAuditLog;
import com.salesway.reports.entity.DailyReportInputs;
import com.salesway.reports.entity.DailyReportMetrics;
import com.salesway.reports.repository.DailyReportAuditLogRepository;
import com.salesway.reports.repository.DailyReportInputsRepository;
import com.salesway.reports.repository.DailyReportMetricsRepository;
import com.salesway.reports.repository.DailyReportRepository;
import com.salesway.security.CustomUserDetails;
import com.salesway.notifications.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DailyReportService {
    private static final Logger LOG = LoggerFactory.getLogger(DailyReportService.class);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final DailyReportRepository dailyReportRepository;
    private final DailyReportInputsRepository dailyReportInputsRepository;
    private final DailyReportMetricsRepository dailyReportMetricsRepository;
    private final DailyReportAuditLogRepository dailyReportAuditLogRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final NotificationService notificationService;

    public DailyReportService(
            DailyReportRepository dailyReportRepository,
            DailyReportInputsRepository dailyReportInputsRepository,
            DailyReportMetricsRepository dailyReportMetricsRepository,
            DailyReportAuditLogRepository dailyReportAuditLogRepository,
            CompanyMembershipRepository companyMembershipRepository,
            NotificationService notificationService
    ) {
        this.dailyReportRepository = dailyReportRepository;
        this.dailyReportInputsRepository = dailyReportInputsRepository;
        this.dailyReportMetricsRepository = dailyReportMetricsRepository;
        this.dailyReportAuditLogRepository = dailyReportAuditLogRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public DailyReportResponse getTodayReport() {
        CompanyMembership membership = getReportingMembership(true);
        DailyReport report = getOrCreateReport(membership, LocalDate.now(ZoneOffset.UTC));
        DailyReportInputs inputs = getOrCreateInputs(report);
        return toResponse(report, inputs);
    }

    @Transactional
    public DailyReportResponse getReport(LocalDate reportDate) {
        CompanyMembership membership = getReportingMembership(true);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (reportDate.equals(today)) {
            DailyReport report = getOrCreateReport(membership, reportDate);
            DailyReportInputs inputs = getOrCreateInputs(report);
            return toResponse(report, inputs);
        }

        DailyReport report = dailyReportRepository
                .findByAgentMembershipIdAndReportDate(membership.getId(), reportDate)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report not found"));
        DailyReportInputs inputs = dailyReportInputsRepository
                .findByDailyReportId(report.getId())
                .orElseGet(DailyReportInputs::new);
        return toResponse(report, inputs);
    }

    @Transactional(readOnly = true)
    public List<DailyReportResponse> getReportsInRange(LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        CompanyMembership membership = getReportingMembership(true);
        List<DailyReport> reports = dailyReportRepository
                .findByAgentMembershipIdAndReportDateBetweenOrderByReportDateAsc(membership.getId(), from, to);
        return mapReportsWithInputs(reports);
    }

    @Transactional(readOnly = true)
    public List<DailyReportResponse> getRecentReports(int days) {
        if (days <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Days must be positive");
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate from = today.minusDays(days - 1L);
        return getReportsInRange(from, today);
    }

    @Transactional(readOnly = true)
    public List<DailyReportResponse> getCurrentMonthReports() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate from = today.withDayOfMonth(1);
        return getReportsInRange(from, today);
    }

    @Transactional(readOnly = true)
    public DailyReportSummaryResponse getSummary(LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        CompanyMembership membership = getReportingMembership(true);
        List<DailyReport> reports = dailyReportRepository
                .findByAgentMembershipIdAndReportDateBetweenOrderByReportDateAsc(membership.getId(), from, to);
        if (reports.isEmpty()) {
            return emptySummary(from, to);
        }

        Map<UUID, DailyReportInputs> inputsMap = fetchInputsByReportId(reports);

        int outboundDials = 0;
        int pickups = 0;
        int conversations30sPlus = 0;
        int salesCallBookedFromOutbound = 0;
        int salesCallOnCalendar = 0;
        int noShow = 0;
        int rescheduleRequest = 0;
        int cancel = 0;
        int deposits = 0;
        int salesOneCallClose = 0;
        int followupSales = 0;
        int upsellConversationTaken = 0;
        int upsells = 0;
        BigDecimal contractValue = ZERO;
        BigDecimal newCashCollected = ZERO;

        for (DailyReport report : reports) {
            DailyReportInputs inputs = inputsMap.getOrDefault(report.getId(), new DailyReportInputs());
            outboundDials += inputs.getOutboundDials();
            pickups += inputs.getPickups();
            conversations30sPlus += inputs.getConversations30sPlus();
            salesCallBookedFromOutbound += inputs.getSalesCallBookedFromOutbound();
            salesCallOnCalendar += inputs.getSalesCallOnCalendar();
            noShow += inputs.getNoShow();
            rescheduleRequest += inputs.getRescheduleRequest();
            cancel += inputs.getCancel();
            deposits += inputs.getDeposits();
            salesOneCallClose += inputs.getSalesOneCallClose();
            followupSales += inputs.getFollowupSales();
            upsellConversationTaken += inputs.getUpsellConversationTaken();
            upsells += inputs.getUpsells();
            contractValue = contractValue.add(inputs.getContractValue());
            newCashCollected = newCashCollected.add(inputs.getNewCashCollected());
        }

        int totalSales = salesOneCallClose + followupSales + upsells;
        int salesCallShowups = Math.max(0, salesCallOnCalendar - noShow - cancel);

        return new DailyReportSummaryResponse(
                from,
                to,
                reports.size(),
                outboundDials,
                pickups,
                conversations30sPlus,
                salesCallBookedFromOutbound,
                salesCallOnCalendar,
                noShow,
                rescheduleRequest,
                cancel,
                deposits,
                salesOneCallClose,
                followupSales,
                upsellConversationTaken,
                upsells,
                contractValue,
                newCashCollected,
                totalSales,
                rate(pickups, outboundDials),
                rate(salesCallShowups, salesCallOnCalendar),
                rate(salesCallBookedFromOutbound, conversations30sPlus),
                rate(salesOneCallClose, totalSales),
                rate(followupSales, totalSales),
                rate(totalSales, salesCallOnCalendar),
                rate(upsells, upsellConversationTaken),
                rate(newCashCollected, contractValue),
                divide(contractValue, totalSales, 2),
                divide(newCashCollected, totalSales, 2)
        );
    }

    @Transactional
    public DailyReportResponse saveDraft(DailyReportInputsRequest request) {
        CompanyMembership membership = getReportingMembership(true);
        DailyReport report = getOrCreateReport(membership, LocalDate.now(ZoneOffset.UTC));
        ensureEditable(report, false);

        DailyReportInputs inputs = getOrCreateInputs(report);
        applyInputs(inputs, request);
        dailyReportInputsRepository.save(inputs);

        report.setStatus(DailyReportStatus.DRAFT);
        dailyReportRepository.save(report);
        updateMetrics(report, inputs);
        writeAudit(report, membership, DailyReportAuditAction.DRAFT_UPDATE);

        return toResponse(report, inputs);
    }

    @Transactional
    public DailyReportResponse submitReport(DailyReportInputsRequest request) {
        CompanyMembership membership = getReportingMembership(true);
        DailyReport report = getOrCreateReport(membership, LocalDate.now(ZoneOffset.UTC));
        ensureEditable(report, true);

        DailyReportInputs inputs = getOrCreateInputs(report);
        applyInputs(inputs, request);
        dailyReportInputsRepository.save(inputs);

        report.setStatus(DailyReportStatus.SUBMITTED);
        report.setSubmittedAt(Instant.now());
        report.setSubmittedByMembership(membership);
        dailyReportRepository.save(report);
        updateMetrics(report, inputs);
        writeAudit(report, membership, DailyReportAuditAction.SUBMIT);
        notifyManager(report, inputs);

        return toResponse(report, inputs);
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

    private DailyReport getOrCreateReport(CompanyMembership membership, LocalDate reportDate) {
        Optional<DailyReport> existing = dailyReportRepository
                .findByAgentMembershipIdAndReportDate(membership.getId(), reportDate);
        if (existing.isPresent()) {
            return existing.get();
        }

        DailyReport report = new DailyReport();
        report.setCompany(membership.getCompany());
        report.setAgentMembership(membership);
        report.setReportDate(reportDate);
        report.setStatus(DailyReportStatus.DRAFT);
        return dailyReportRepository.save(report);
    }

    private DailyReportInputs getOrCreateInputs(DailyReport report) {
        return dailyReportInputsRepository
                .findByDailyReportId(report.getId())
                .orElseGet(() -> {
                    DailyReportInputs inputs = new DailyReportInputs();
                    inputs.setDailyReport(report);
                    return dailyReportInputsRepository.saveAndFlush(inputs);
                });
    }

    private void ensureEditable(DailyReport report, boolean submitting) {
        if (report.getLockedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Report is locked");
        }

        if (report.getStatus() == DailyReportStatus.SUBMITTED
                || report.getStatus() == DailyReportStatus.AUTO_SUBMITTED) {
            String message = submitting ? "Report already submitted" : "Report is already submitted";
            throw new ResponseStatusException(HttpStatus.CONFLICT, message);
        }
    }

    private void applyInputs(DailyReportInputs inputs, DailyReportInputsRequest request) {
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

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date range is required");
        }
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date range");
        }
    }

    private List<DailyReportResponse> mapReportsWithInputs(List<DailyReport> reports) {
        if (reports.isEmpty()) {
            return Collections.emptyList();
        }
        Map<UUID, DailyReportInputs> inputsByReportId = fetchInputsByReportId(reports);
        return reports.stream()
                .map(report -> {
                    DailyReportInputs inputs = inputsByReportId.getOrDefault(report.getId(), new DailyReportInputs());
                    return toResponse(report, inputs);
                })
                .toList();
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

    private DailyReportSummaryResponse emptySummary(LocalDate from, LocalDate to) {
        return new DailyReportSummaryResponse(
                from,
                to,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                ZERO,
                ZERO,
                0,
                ZERO,
                ZERO,
                ZERO,
                ZERO,
                ZERO,
                ZERO,
                ZERO,
                ZERO,
                ZERO,
                ZERO
        );
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

    private DailyReportResponse toResponse(DailyReport report, DailyReportInputs inputs) {
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

        return new DailyReportResponse(
                report.getId(),
                report.getReportDate(),
                report.getStatus(),
                report.getSubmittedAt(),
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

    private void notifyManager(DailyReport report, DailyReportInputs inputs) {
        CompanyMembership agent = report.getAgentMembership();
        CompanyMembership manager = agent.getManagerMembership();
        if (manager == null) {
            return;
        }

        try {
            notificationService.createNotification(
                    report.getCompany(),
                    manager,
                    com.salesway.common.enums.NotificationType.REPORT_SUBMITTED,
                    Map.of(
                            "agent_membership_id", agent.getId().toString(),
                            "agent_email", agent.getUser().getEmail(),
                            "report_date", report.getReportDate().toString(),
                            "message", "Utilizatorul " + agent.getUser().getEmail()
                                    + " a dat submit la activitatea de azi."
                    ),
                    Instant.now()
            );

            if (inputs.getContractValue() != null && inputs.getContractValue().compareTo(ZERO) > 0) {
                notificationService.createNotification(
                        report.getCompany(),
                        manager,
                        com.salesway.common.enums.NotificationType.SALE_RECORDED,
                        Map.of(
                                "agent_membership_id", agent.getId().toString(),
                                "agent_email", agent.getUser().getEmail(),
                                "contract_value", inputs.getContractValue(),
                                "new_cash_collected", inputs.getNewCashCollected(),
                                "report_date", report.getReportDate().toString(),
                                "message", "Utilizatorul " + agent.getUser().getEmail()
                                        + " a vandut in valoare de " + inputs.getContractValue() + " lei."
                        ),
                        Instant.now()
                );
            }
        } catch (RuntimeException ex) {
            LOG.warn("Failed to create report notifications for report {}", report.getId(), ex);
        }
    }
}
