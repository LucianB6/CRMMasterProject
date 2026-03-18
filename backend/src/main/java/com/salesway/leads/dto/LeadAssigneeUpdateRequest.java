package com.salesway.leads.dto;

import java.util.UUID;

public class LeadAssigneeUpdateRequest {
    private UUID assignedToUserId;

    public UUID getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(UUID assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }
}
