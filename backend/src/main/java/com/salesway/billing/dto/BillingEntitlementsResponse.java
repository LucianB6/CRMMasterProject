package com.salesway.billing.dto;

public record BillingEntitlementsResponse(
        String planCode,
        String subscriptionStatus,
        boolean aiAssistantEnabled,
        boolean aiInsightsEnabled,
        boolean canInviteUsers,
        boolean canCreateAgents,
        int includedSeats,
        int activeSeats,
        int pendingInvites,
        int availableSeats,
        int aiAssistantLimit,
        int aiAssistantUsed,
        int aiAssistantRemaining,
        int aiInsightsLimit,
        int aiInsightsUsed,
        int aiInsightsRemaining
) {
}
