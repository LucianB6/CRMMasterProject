package com.salesway.billing.service;

import com.salesway.common.enums.MembershipStatus;
import com.salesway.companies.entity.Company;
import com.salesway.invitations.enums.InvitationStatus;
import com.salesway.invitations.repository.InvitationRepository;
import com.salesway.memberships.repository.CompanyMembershipRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.EnumSet;

@Service
public class SubscriptionAccessService {
    private final PlanCatalogService planCatalogService;
    private final CompanyMembershipRepository companyMembershipRepository;
    private final InvitationRepository invitationRepository;

    public SubscriptionAccessService(
            PlanCatalogService planCatalogService,
            CompanyMembershipRepository companyMembershipRepository,
            InvitationRepository invitationRepository
    ) {
        this.planCatalogService = planCatalogService;
        this.companyMembershipRepository = companyMembershipRepository;
        this.invitationRepository = invitationRepository;
    }

    public void assertSeatAvailableForInvite(Company company) {
        long activeSeats = activeSeatCount(company);
        long pendingInvites = invitationRepository.countByCompanyIdAndStatus(company.getId(), InvitationStatus.PENDING);
        int limit = seatLimit(company);
        if (activeSeats + pendingInvites >= limit) {
            throw seatLimitExceeded();
        }
    }

    public void assertSeatAvailableForDirectAssignment(Company company) {
        if (activeSeatCount(company) >= seatLimit(company)) {
            throw seatLimitExceeded();
        }
    }

    public void assertSeatAvailableForAcceptance(Company company) {
        if (activeSeatCount(company) >= seatLimit(company)) {
            throw seatLimitExceeded();
        }
    }

    public void assertAiFeaturesAvailable(Company company) {
        assertSubscriptionActive(company);
    }

    public void assertCanCreateCampaign(Company company) {
        assertSubscriptionActive(company);
    }

    public void assertCanCreateLead(Company company) {
        assertSubscriptionActive(company);
    }

    public boolean isSubscriptionActive(Company company) {
        String status = company.getSubscriptionStatus();
        return ("active".equalsIgnoreCase(status) || "trialing".equalsIgnoreCase(status))
                && company.getSubscriptionCancelledAt() == null
                && company.getSubscriptionGraceUntil() == null;
    }

    private void assertSubscriptionActive(Company company) {
        if (!isSubscriptionActive(company)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Subscription is not active");
        }
        if (company.getSubscriptionGraceUntil() != null && company.getSubscriptionGraceUntil().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Subscription grace period expired");
        }
    }

    private long activeSeatCount(Company company) {
        return companyMembershipRepository.countByCompanyIdAndStatusIn(
                company.getId(),
                EnumSet.of(MembershipStatus.ACTIVE)
        );
    }

    private int seatLimit(Company company) {
        return planCatalogService.getPlan(company.getPlanCode()).includedSeats();
    }

    private ResponseStatusException seatLimitExceeded() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "Plan seat limit reached");
    }
}
