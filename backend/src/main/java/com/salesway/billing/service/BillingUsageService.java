package com.salesway.billing.service;

import com.salesway.billing.dto.BillingCurrentPlanResponse;
import com.salesway.billing.dto.BillingEntitlementsResponse;
import com.salesway.billing.dto.BillingUsageItemResponse;
import com.salesway.billing.dto.BillingUsageResponse;
import com.salesway.billing.entity.CompanyUsageBalance;
import com.salesway.billing.entity.UsageType;
import com.salesway.billing.repository.CompanyUsageBalanceRepository;
import com.salesway.companies.entity.Company;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import com.salesway.manager.service.CompanyAccessService;
import com.salesway.memberships.entity.CompanyMembership;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import com.salesway.common.enums.MembershipStatus;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Arrays;
import java.util.List;

@Service
public class BillingUsageService {
    private final CompanyAccessService companyAccessService;
    private final CompanyUsageBalanceRepository companyUsageBalanceRepository;
    private final PlanCatalogService planCatalogService;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final InvitationRepository invitationRepository;

    public BillingUsageService(
            CompanyAccessService companyAccessService,
            CompanyUsageBalanceRepository companyUsageBalanceRepository,
            PlanCatalogService planCatalogService,
            CompanyMembershipRepository companyMembershipRepository,
            InvitationRepository invitationRepository
    ) {
        this.companyAccessService = companyAccessService;
        this.companyUsageBalanceRepository = companyUsageBalanceRepository;
        this.planCatalogService = planCatalogService;
        this.companyMembershipRepository = companyMembershipRepository;
        this.invitationRepository = invitationRepository;
    }

    @Transactional
    public BillingCurrentPlanResponse getCurrentPlan() {
        Company company = companyAccessService.getActiveMembership().getCompany();
        PlanCatalogService.PlanDefinition plan = planCatalogService.getPlan(company.getPlanCode());
        return new BillingCurrentPlanResponse(
                plan.planCode(),
                company.getSubscriptionStatus(),
                company.getSubscriptionCurrentPeriodEnd(),
                plan.includedSeats(),
                plan.usageLimits().getOrDefault(UsageType.AI_ASSISTANT, 0),
                plan.usageLimits().getOrDefault(UsageType.AI_INSIGHTS, 0)
        );
    }

    @Transactional
    public BillingUsageResponse getCurrentUsage() {
        Company company = companyAccessService.getActiveMembership().getCompany();
        LocalDate periodStart = currentPeriodStart();
        PlanCatalogService.PlanDefinition plan = planCatalogService.getPlan(company.getPlanCode());

        List<BillingUsageItemResponse> items = Arrays.stream(UsageType.values())
                .map(usageType -> {
                    int used = companyUsageBalanceRepository
                            .findByCompanyIdAndUsageTypeAndPeriodStart(company.getId(), usageType, periodStart)
                            .map(CompanyUsageBalance::getUsedUnits)
                            .orElse(0);
                    int limit = plan.usageLimits().getOrDefault(usageType, 0);
                    return new BillingUsageItemResponse(
                            usageType.name(),
                            used,
                            limit,
                            Math.max(limit - used, 0)
                    );
                })
                .toList();

        return new BillingUsageResponse(plan.planCode(), periodStart, items);
    }

    @Transactional
    public BillingEntitlementsResponse getEntitlements() {
        Company company = companyAccessService.getActiveMembership().getCompany();
        LocalDate periodStart = currentPeriodStart();
        PlanCatalogService.PlanDefinition plan = planCatalogService.getPlan(company.getPlanCode());

        int activeSeats = (int) companyMembershipRepository.countByCompanyIdAndStatusIn(
                company.getId(),
                EnumSet.of(MembershipStatus.ACTIVE)
        );
        int pendingInvites = Math.toIntExact(
                invitationRepository.countByCompanyIdAndStatus(company.getId(), InvitationStatus.PENDING)
        );

        UsageSnapshot assistantUsage = usageSnapshot(company, periodStart, UsageType.AI_ASSISTANT);
        UsageSnapshot insightsUsage = usageSnapshot(company, periodStart, UsageType.AI_INSIGHTS);
        int availableSeats = Math.max(plan.includedSeats() - activeSeats, 0);

        return new BillingEntitlementsResponse(
                plan.planCode(),
                company.getSubscriptionStatus(),
                assistantUsage.limit() > 0 && "active".equalsIgnoreCase(nullToEmpty(company.getSubscriptionStatus())),
                insightsUsage.limit() > 0 && "active".equalsIgnoreCase(nullToEmpty(company.getSubscriptionStatus())),
                activeSeats + pendingInvites < plan.includedSeats(),
                activeSeats < plan.includedSeats(),
                plan.includedSeats(),
                activeSeats,
                pendingInvites,
                availableSeats,
                assistantUsage.limit(),
                assistantUsage.used(),
                assistantUsage.remaining(),
                insightsUsage.limit(),
                insightsUsage.used(),
                insightsUsage.remaining()
        );
    }

    @Transactional
    public void consumeUsage(Company company, UsageType usageType, int units) {
        if (units <= 0) {
            return;
        }
        LocalDate periodStart = currentPeriodStart();
        PlanCatalogService.PlanDefinition plan = planCatalogService.getPlan(company.getPlanCode());
        int limit = plan.usageLimits().getOrDefault(usageType, 0);
        CompanyUsageBalance balance = companyUsageBalanceRepository
                .findByCompanyIdAndUsageTypeAndPeriodStart(company.getId(), usageType, periodStart)
                .orElseGet(() -> {
                    CompanyUsageBalance created = new CompanyUsageBalance();
                    created.setCompany(company);
                    created.setUsageType(usageType);
                    created.setPeriodStart(periodStart);
                    created.setUsedUnits(0);
                    return created;
                });

        int nextValue = balance.getUsedUnits() + units;
        if (limit > 0 && nextValue > limit) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Plan limit reached for " + usageType.name().toLowerCase());
        }

        balance.setUsedUnits(nextValue);
        companyUsageBalanceRepository.save(balance);
    }

    @Transactional
    public void assertUsageAvailable(Company company, UsageType usageType, int units) {
        if (units <= 0) {
            return;
        }
        LocalDate periodStart = currentPeriodStart();
        int limit = planCatalogService.getLimit(company.getPlanCode(), usageType);
        int used = companyUsageBalanceRepository
                .findByCompanyIdAndUsageTypeAndPeriodStart(company.getId(), usageType, periodStart)
                .map(CompanyUsageBalance::getUsedUnits)
                .orElse(0);
        if (limit > 0 && used + units > limit) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Plan limit reached for " + usageType.name().toLowerCase());
        }
    }

    private LocalDate currentPeriodStart() {
        LocalDate today = LocalDate.now();
        return today.withDayOfMonth(1);
    }

    private UsageSnapshot usageSnapshot(Company company, LocalDate periodStart, UsageType usageType) {
        int used = companyUsageBalanceRepository
                .findByCompanyIdAndUsageTypeAndPeriodStart(company.getId(), usageType, periodStart)
                .map(CompanyUsageBalance::getUsedUnits)
                .orElse(0);
        int limit = planCatalogService.getLimit(company.getPlanCode(), usageType);
        return new UsageSnapshot(used, limit, Math.max(limit - used, 0));
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private record UsageSnapshot(int used, int limit, int remaining) {
    }
}
