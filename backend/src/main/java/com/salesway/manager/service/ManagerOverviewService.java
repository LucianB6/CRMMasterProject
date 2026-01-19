package com.salesway.manager.service;

import com.salesway.common.enums.MembershipRole;
import com.salesway.common.enums.MembershipStatus;
import com.salesway.manager.dto.ManagerAgentResponse;
import com.salesway.manager.dto.ManagerTeamPerformancePointResponse;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.reports.dto.DailyReportSummaryResponse;
import com.salesway.reports.entity.DailyReport;
import com.salesway.reports.entity.DailyReportInputs;
import com.salesway.reports.repository.DailyReportInputsRepository;
import com.salesway.reports.repository.DailyReportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Collections;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ManagerOverviewService {
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final ManagerAccessService managerAccessService;
    private final DailyReportRepository dailyReportRepository;
    private final DailyReportInputsRepository dailyReportInputsRepository;
    private final CompanyMembershipRepository companyMembershipRepository;

    public ManagerOverviewService(
            ManagerAccessService managerAccessService,
            DailyReportRepository dailyReportRepository,
            DailyReportInputsRepository dailyReportInputsRepository,
            CompanyMembershipRepository companyMembershipRepository
    ) {
        this.managerAccessService = managerAccessService;
        this.dailyReportRepository = dailyReportRepository;
        this.dailyReportInputsRepository = dailyReportInputsRepository;
        this.companyMembershipRepository = companyMembershipRepository;
    }

    @Transactional(readOnly = true)
    public DailyReportSummaryResponse getTeamSummary(LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        CompanyMembership manager = managerAccessService.getManagerMembership();
        List<DailyReport> reports = getScopedReports(manager, from, to);
        return buildSummary(from, to, reports);
    }

    @Transactional(readOnly = true)
    public DailyReportSummaryResponse getAgentSummary(UUID agentMembershipId, LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        CompanyMembership manager = managerAccessService.getManagerMembership();
        CompanyMembership agent = findAgentForManager(manager, agentMembershipId);
        if (agent.getRole() != MembershipRole.AGENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Membership is not an agent");
        }

        List<DailyReport> reports = getScopedReportsForAgent(manager, agentMembershipId, from, to);
        return buildSummary(from, to, reports);
    }

    @Transactional(readOnly = true)
    public List<ManagerTeamPerformancePointResponse> getTeamPerformance(LocalDate from, LocalDate to) {
        validateDateRange(from, to);
        CompanyMembership manager = managerAccessService.getManagerMembership();
        List<DailyReport> reports = getScopedReports(manager, from, to);
        if (reports.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, DailyReportInputs> inputsByReportId = fetchInputsByReportId(reports);
        Map<LocalDate, ManagerTeamPerformancePointResponse> points = new LinkedHashMap<>();
        for (DailyReport report : reports) {
            DailyReportInputs inputs = inputsByReportId.getOrDefault(report.getId(), new DailyReportInputs());
            ManagerTeamPerformancePointResponse existing = points.get(report.getReportDate());
            int totalSales = inputs.getSalesOneCallClose() + inputs.getFollowupSales() + inputs.getUpsells();
            if (existing == null) {
                points.put(report.getReportDate(), new ManagerTeamPerformancePointResponse(
                        report.getReportDate(),
                        inputs.getOutboundDials(),
                        totalSales,
                        inputs.getNewCashCollected()
                ));
            } else {
                points.put(report.getReportDate(), new ManagerTeamPerformancePointResponse(
                        report.getReportDate(),
                        existing.getOutboundDials() + inputs.getOutboundDials(),
                        existing.getTotalSales() + totalSales,
                        existing.getNewCashCollected().add(inputs.getNewCashCollected())
                ));
            }
        }

        return points.values().stream().toList();
    }

    @Transactional(readOnly = true)
    public List<ManagerAgentResponse> getAgents() {
        CompanyMembership manager = managerAccessService.getManagerMembership();
        List<CompanyMembership> agents = manager.getRole() == MembershipRole.ADMIN
                ? companyMembershipRepository.findByCompanyIdAndRoleAndStatusIn(
                        manager.getCompany().getId(),
                        MembershipRole.AGENT,
                        EnumSet.of(MembershipStatus.ACTIVE, MembershipStatus.INVITED)
                )
                : companyMembershipRepository.findByManagerMembershipIdAndRoleAndStatusIn(
                        manager.getId(),
                        MembershipRole.AGENT,
                        EnumSet.of(MembershipStatus.ACTIVE, MembershipStatus.INVITED)
                );

        return agents.stream()
                .map(membership -> new ManagerAgentResponse(
                        membership.getId(),
                        membership.getUser().getId(),
                        membership.getUser().getEmail(),
                        membership.getStatus().name(),
                        membership.getTeam() != null ? membership.getTeam().getId() : null,
                        membership.getTeam() != null ? membership.getTeam().getName() : null
                ))
                .toList();
    }

    private DailyReportSummaryResponse buildSummary(LocalDate from, LocalDate to, List<DailyReport> reports) {
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

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date range is required");
        }
        if (from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date range");
        }
    }

    private CompanyMembership findAgentForManager(CompanyMembership manager, UUID agentMembershipId) {
        return manager.getRole() == MembershipRole.ADMIN
                ? companyMembershipRepository.findByCompanyIdAndId(manager.getCompany().getId(), agentMembershipId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"))
                : companyMembershipRepository.findByIdAndManagerMembershipId(agentMembershipId, manager.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));
    }

    private List<DailyReport> getScopedReports(CompanyMembership manager, LocalDate from, LocalDate to) {
        if (manager.getRole() == MembershipRole.ADMIN) {
            return dailyReportRepository.findByCompanyIdAndReportDateBetweenOrderByReportDateAsc(
                    manager.getCompany().getId(),
                    from,
                    to
            );
        }
        return dailyReportRepository.findByAgentMembershipManagerMembershipIdAndReportDateBetweenOrderByReportDateAsc(
                manager.getId(),
                from,
                to
        );
    }

    private List<DailyReport> getScopedReportsForAgent(
            CompanyMembership manager,
            UUID agentMembershipId,
            LocalDate from,
            LocalDate to
    ) {
        if (manager.getRole() == MembershipRole.ADMIN) {
            return dailyReportRepository.findByCompanyIdAndAgentMembershipIdAndReportDateBetweenOrderByReportDateAsc(
                    manager.getCompany().getId(),
                    agentMembershipId,
                    from,
                    to
            );
        }
        return dailyReportRepository
                .findByAgentMembershipManagerMembershipIdAndAgentMembershipIdAndReportDateBetweenOrderByReportDateAsc(
                        manager.getId(),
                        agentMembershipId,
                        from,
                        to
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
}
