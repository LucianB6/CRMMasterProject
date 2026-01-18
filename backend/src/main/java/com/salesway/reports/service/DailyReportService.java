package com.salesway.reports.service;

import com.salesway.common.enums.DailyReportAuditAction;
import com.salesway.common.enums.DailyReportStatus;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.common.enums.MembershipRole;
import com.salesway.companies.entity.Company;
import com.salesway.companies.repository.CompanyRepository;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.reports.dto.DailyReportInputsRequest;
import com.salesway.reports.dto.DailyReportInputsResponse;
import com.salesway.reports.dto.DailyReportResponse;
import com.salesway.reports.entity.DailyReport;
import com.salesway.reports.entity.DailyReportAuditLog;
import com.salesway.reports.entity.DailyReportInputs;
import com.salesway.reports.entity.DailyReportMetrics;
import com.salesway.reports.repository.DailyReportAuditLogRepository;
import com.salesway.reports.repository.DailyReportInputsRepository;
import com.salesway.reports.repository.DailyReportMetricsRepository;
import com.salesway.reports.repository.DailyReportRepository;
import com.salesway.security.CustomUserDetails;
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
import java.util.EnumSet;
import java.util.Optional;

@Service
public class DailyReportService {
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final DailyReportRepository dailyReportRepository;
    private final DailyReportInputsRepository dailyReportInputsRepository;
    private final DailyReportMetricsRepository dailyReportMetricsRepository;
    private final DailyReportAuditLogRepository dailyReportAuditLogRepository;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final CompanyRepository companyRepository;

    public DailyReportService(
            DailyReportRepository dailyReportRepository,
            DailyReportInputsRepository dailyReportInputsRepository,
            DailyReportMetricsRepository dailyReportMetricsRepository,
            DailyReportAuditLogRepository dailyReportAuditLogRepository,
            CompanyMembershipRepository companyMembershipRepository,
            CompanyRepository companyRepository
    ) {
        this.dailyReportRepository = dailyReportRepository;
        this.dailyReportInputsRepository = dailyReportInputsRepository;
        this.dailyReportMetricsRepository = dailyReportMetricsRepository;
        this.dailyReportAuditLogRepository = dailyReportAuditLogRepository;
        this.companyMembershipRepository = companyMembershipRepository;
        this.companyRepository = companyRepository;
    }

    @Transactional
    public DailyReportResponse getTodayReport() {
        CompanyMembership membership = getReportingMembership(true);
        DailyReport report = getOrCreateReport(membership, LocalDate.now(ZoneOffset.UTC));
        DailyReportInputs inputs = getOrCreateInputs(report);
        return toResponse(report, inputs);
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
}
